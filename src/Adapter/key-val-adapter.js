import BaseAdapter from './base-adapter';
import Util from './../util';

const BATCH_TIME = 100;
export default class KeyValAdapter extends BaseAdapter {
    constructor(adapter) {
        super(adapter);
        this.batchInterval = setInterval(() => this.clearBatch(), BATCH_TIME);
        this.batchQ = {};
        this.batchDone = {};
    }
    checkState(incoming, existing, opt) {
        opt = Gun.num.is(opt) ? { machine: opt } : { machine: Gun.state() };

        var HAM = Gun.HAM(
            opt.machine,
            incoming['>'],
            existing['>'],
            incoming[':'],
            existing[':'],
        );
        if (HAM.defer) {
            console.error('incoming node state in the future', {
                incoming,
                existing,
                opt,
            });
            return false;
        }
        if (!HAM.incoming) {
            return false;
        }
        return true;
    }
    /**
     *  @param {Array|Object}    result    - An array of objects (= records) like so
     *                               {
     *                                  key: 'uuid for the node'
     *                                  nodeKey: 'node value's name'
     *                                  val:     'Value'
     *                                  rel:     'Relationship (if referring to another node)
     *                                  state:   'conflict resolution value'
     *                               }
     *  @param {Function} callback - Call once read finished
     *  @return {void}
     */
    read(result, done) {
        if (result) {
            const key =
                result instanceof Array && result.length
                    ? result[0].key
                    : result.key;
            result = Util.gunify(key, result);
        }
        done(null, result);
    }

    /**
     *  @param {Object}   delta    - A delta for the current node
     *  @param {Function} callback - Called once write finished
     *  @return {void}
     */
    write(delta, done) {
        const soul = delta['#'],
            field = delta['.'],
            val = delta[':'],
            state = delta['>'];

        // base node
        const writeHandler = (err, existing) => {
            // Merge the delta with existing node
            let errorOk = !err || err.code() === 400;
            let validState = true;
            if (errorOk && delta && existing && existing[0]) {
                const existingNode = {
                    '#': existing[0].key,
                    '.': existing[0].field,
                    ':': existing[0].val || { '#': existing[0].rel },
                    '>': existing[0].state,
                };

                validState = this.checkState(delta, existingNode);
            }

            // Write if valid state to storage
            if (validState && this.Gun.obj.is(delta)) {
                let node = { state, field, key: soul };
                // Add rel or val
                if (this.Gun.obj.is(val)) {
                    node.rel = val['#'];
                } else {
                    node.val = val;
                }

                // this._put([node], done);
                this.batch(node, done);
            } else done();
        };

        this._get(soul, field, writeHandler);
    }

    batch(node, done) {
        const { key } = node;
        const soulQ = (this.batchQ[key] = this.batchQ[key] || []);
        this.batchDone[key] = done;
        soulQ.push(node);
    }

    clearBatch() {
        for (let k in this.batchQ) {
            const nodes = this.batchQ[k];
            const done = this.batchDone[k];
            delete this.batchQ[k];
            this.batchDone[k] = null;
            this._put(nodes, done);
        }
    }
}
