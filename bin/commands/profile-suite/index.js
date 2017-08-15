module.exports = function(finished, args, Adapter, opt) {
    const path = require('path');
    const Mocha = require('mocha');
    const fs = require('fs');
    const assert = require('assert');

    // Essential opt setup
    opt = opt || {};
    opt.file = false;
    
    const gunPath = args['skip-packaged-gun'] ? 'gun/gun' : './../gun/gun';
    global.Gun = require(gunPath);

    // Gun not found. Error out
    if (!global.Gun) {
        throw "GUN NOT FOUND! Unable to continue integration tests. If using the --skip-packaged-gun flag, be sure that gun is available included in node modules.";
    }

    Adapter.bootstrap(global.Gun);

    // Ensure unique identity for this test run.
    let keyBase = Date.now() + "";
    let keyChain = {};    


    // An easy way to re-create gun as needed
    let getGun = function() {
        return new Gun(opt);
    }

    let getNode = function() {
        return {
            one: 'one',
            two: 'two',
            three: 'three',
            four: 'four',
            five: 'five',
            six: 'six',
            seven: 'seven',
            eight: 'eight',
            nine: 'nine',
            ten: 'ten'
        };
    }

    let key = function(base) {
        let key = {};
        key.base = base;

        key.make = function(suffix) {
            return `${key.base}_${suffix}`;
        }
        return key;
    }

    let ack = function(desc, target, done) {
        let ack = {};

        ack.desc = desc;
        ack.target = target;
        ack.count = 0;
        ack.start = Date.now();

        ack.ack = function() {
            ack.count++;

            if ((ack.count % 100) === 0) {
                console.log(ack.count);
            }

            if (ack.count === ack.target) {
                ack.done();
            } 
        };

        ack.done = function() {
            let ms = Date.now() - ack.start;
            console.log(`${ack.desc}: ${ms}ms; ${ms/1000}s; ${ms/target} ms/node.`);
            done();
        }

        return ack;
    }

    

    let smallSequence = function() {
        // console.log("__ SMALL NODES: 10 Properties Each ___");

        // // Write 10K nodes
        // let profileWrite = function() {
        //     let $gun = getGun();
        //     let target = 10000;
        //     let res = ack(`Write ${target} nodes: `, target, profileRead);
        //     let ring = key(keyBase);
        //     for (var i = 0; i < target; i++) {
        //         $gun.get(ring.make(i)).put(getNode(), res.ack);
        //     }
        // }

        // // Write 10K nodes
        // let profileRead = function() {
        //     let $gun = getGun();
        //     let target = 10000;
        //     let res = ack(`Read ${target} nodes: `, target, upsert);
        //     let ring = key(keyBase);
        //     let node = getNode();
        //     let nodeKeys = Object.keys(node);
        //     for (var i = 0; i < target; i++) {
        //         $gun.get(ring.make(i)).on(val => {
                    
        //             // remove metadata
        //             delete val._;

        //             // Check for node completeness
        //             if (Object.keys(val).length === nodeKeys.length) {
        //                 res.ack();
        //             }
        //         });
        //     }
        // }

        // // Update 10K nodes
        // let upsert = function() {
        //     let $gun = getGun();
        //     let target = 10000;
        //     let res = ack(`Update ${target} nodes: `, target, updateSingleProperty);
        //     let ring = key(keyBase);
        //     for (var i = 0; i < target; i++) {
        //         $gun.get(ring.make(i)).put(getNode(), res.ack);
        //     }
        // }

        // // Update 10K nodes
        // let updateSingleProperty = function() {
        //     let $gun = getGun();
        //     let target = 10000;
        //     let res = ack(`Update single field on ${target} nodes: `, target, mediumSequence);
        //     let ring = key(keyBase);
        //     for (var i = 0; i < target; i++) {
        //         $gun.get(ring.make(i)).put({one: 'two'}, res.ack);
        //     }
        // }

        // Read 10K node fields
        // let readFields = function() {
        //     let $gun = getGun();
        //     let target = 10000;
        //     let res = ack(`Read ${target} nodes: `, target, mediumSequence);
        //     let ring = key(keyBase);
        //     let node = getNode();
        //     for (var i = 0; i < target; i++) {
        //         $gun.get(ring.make(i)).get('six').on(val => {
        //             if (val.six === 'six') {
        //                 console.log(val);
        //                 res.ack();
        //             }
        //         });
        //     }
        // }

        // Start the sequence
        profileWrite();
    }

    let mediumSequence = function() {
        console.log("__ MEDIUM NODES: 1000 Properties Each ___");
        let target = 1000;

        let node;
        let getMediumNode = function() {
            if (!node) {
                node = {};
                let keyPrefix = "prop";
                let val = "medium_property"
                for (var i = 0; i < 1000; i++) {
                    node[`${keyPrefix}_${i}`] = val;
                }
            }
            return node;
        };


        let profileWrite = function() {
            let $gun = getGun();
            let res = ack(`Write ${target} nodes: `, target, profileRead);
            let ring = key(keyBase + "_MEDIUM");
            for (var i = 0; i < target; i++) {
                $gun.get(ring.make(i)).put(getMediumNode(), res.ack);
            }
        }

        // Write 10K nodes
        let profileRead = function() {
            let $gun = getGun();
            let res = ack(`Read ${target} nodes: `, target, upsert);
            let ring = key(keyBase + "_MEDIUM");
            let node = getMediumNode();
            let nodeKeys = Object.keys(node);
            for (var i = 0; i < target; i++) {
                $gun.get(ring.make(i)).on(val => {
                    
                    // remove metadata
                    delete val._;
                    console.log(Object.keys(val).length);
                    // Check for node completeness
                    if (Object.keys(val).length === nodeKeys.length) {
                        res.ack();
                    }
                });
            }
        }

        // Update 10K nodes
        let upsert = function() {
            let $gun = getGun();
            let res = ack(`Update ${target} nodes: `, target, updateSingleProperty);
            let ring = key(keyBase + "_MEDIUM");
            for (var i = 0; i < target; i++) {
                $gun.get(ring.make(i)).put(getMediumNode(), res.ack);
            }
        }

        // Update 10K nodes
        let updateSingleProperty = function() {
            let $gun = getGun();
            let res = ack(`Update single field on ${target} nodes: `, target, allDone);
            let ring = key(keyBase  + "_MEDIUM");
            for (var i = 0; i < target; i++) {
                $gun.get(ring.make(i)).put({one: 'two'}, res.ack);
            }
        }

        // Read 10K node fields
        // let readFields = function() {
        //     let $gun = getGun();
        //     let res = ack(`Read ${target} nodes: `, target, allDone);
        //     let ring = key(keyBase);
        //     let node = getMediumNode();
        //     for (var i = 0; i < target; i++) {
        //         $gun.get(ring.make(i)).get('six').on(val => {
        //             if (val.six === 'six') {
        //                 res.ack();
        //             }
        //         });
        //     }
        // }

        // start the chain
        profileWrite();
    }

    

    let allDone = function() {
        console.log("Profile finished");
        finished();
    }

    mediumSequence();

}