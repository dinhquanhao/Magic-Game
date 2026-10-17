import base from './vite.config.js';

// Fixed port and no HMR: browser evidence must refer to a stable source snapshot.
export default {...base,server:{host:'127.0.0.1',port:5181,strictPort:true,hmr:false}};
