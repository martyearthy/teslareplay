const fs = require('fs');
const path = require('path');

// Mock window for UMD
global.window = global;

try {
    require('./vendor/protobuf.min.js');
    const protobuf = global.protobuf;
    
    const proto = `
    syntax = "proto3";
    message Test {
        int32 my_field = 1;
    }
    `;
    
    const root = protobuf.parse(proto).root;
    const Test = root.lookupType('Test');
    const msg = Test.decode(new Uint8Array([8, 42]));
    
    console.log('Default keys:', Object.keys(msg));
    
    const rootKeep = protobuf.parse(proto, { keepCase: true }).root;
    const TestKeep = rootKeep.lookupType('Test');
    const msgKeep = TestKeep.decode(new Uint8Array([8, 42]));
    
    console.log('KeepCase keys:', Object.keys(msgKeep));

} catch (e) {
    console.error(e);
}
