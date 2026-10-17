export const ELEMENT_ORDER=['WATER','EARTH','WIND','FIRE','ICE','LIGHTNING','POISON','LIGHT','SHADOW','BLOOD','SPACE','TIME','MAGMA','ASTRAL','NATURE'];
// All parameters and seeds are original; the old WAV bank remains available for A/B.
export const ELEMENT_AUDIO={
 WATER:{base:168,material:'bubble',noise:'pink',modes:[1,1.42,2.8,4.9],cutoff:3600,room:'underwater',keywords:'chảy · bọt · ẩm · sóng',bass:.85},
 EARTH:{base:62,material:'stone',noise:'brown',modes:[1,1.48,2.17,3.83],cutoff:1800,room:'arena',keywords:'đá · rạn · sỏi · nặng',bass:1.1},
 WIND:{base:290,material:'air',noise:'pink',modes:[1,1.05,1.51],cutoff:4200,room:'arena',keywords:'rít · xoáy · lá · thoáng',bass:.65},
 FIRE:{base:103,material:'flame',noise:'brown',modes:[1,1.91,3.12],cutoff:5500,room:'arena',keywords:'lách tách · đối lưu · phập · nóng',bass:.95},
 ICE:{base:691,material:'crystal',noise:'blue',modes:[1,1.47,2.71,4.13,5.3],cutoff:7200,room:'cave',keywords:'tinh thể · nứt · trong · lạnh',bass:.75},
 LIGHTNING:{base:111,material:'electric',noise:'white',modes:[1,2,4.17,7.2],cutoff:8500,room:'arena',keywords:'crack · ion · buzz · sấm',bass:1},
 POISON:{base:139,material:'slime',noise:'pink',modes:[1,1.23,2.7,3.71],cutoff:4800,room:'cave',keywords:'nhầy · sủi · xì · ăn mòn',bass:.8},
 LIGHT:{base:528,material:'bell',noise:'blue',modes:[1,1.25,1.5,2,3],cutoff:7800,room:'cathedral',keywords:'chuông · sáng · thanh · lấp lánh',bass:.65},
 SHADOW:{base:58,material:'void',noise:'brown',modes:[1,1.067,1.39,2.12],cutoff:1500,room:'void',keywords:'hút · trầm · u · mờ',bass:1},
 BLOOD:{base:92,material:'viscous',noise:'brown',modes:[1,1.31,2.43,3.82],cutoff:2400,room:'cave',keywords:'sệt · nhịp · ẩm · căng',bass:.85},
 SPACE:{base:47,material:'warp',noise:'brown',modes:[1,1.07,1.414,2.91],cutoff:2200,room:'void',keywords:'hút · xoay · giãn · sâu',bass:1.15},
 TIME:{base:440,material:'clock',noise:'pink',modes:[1,1.5,2,3,4.01],cutoff:6200,room:'cathedral',keywords:'chuông · lặng · nhịp · trong',bass:.25},
 MAGMA:{base:51,material:'lava',noise:'brown',modes:[1,1.67,2.21,3.5],cutoff:2600,room:'cave',keywords:'sôi · đặc · rền · nứt nóng',bass:1.1},
 ASTRAL:{base:392,material:'stars',noise:'blue',modes:[1,1.5,2,2.5,4],cutoff:6900,room:'void',keywords:'tinh quang · quỹ đạo · ngân · bụi',bass:.7},
 NATURE:{base:146,material:'wood',noise:'brown',modes:[1,1.57,2.83,4.36],cutoff:3900,room:'arena',keywords:'gỗ · lá · hạt · sinh trưởng',bass:.75},
};
const role=(duration,level,category,extra={})=>({duration,targetRmsDb:level,category,...extra});
export const CUE_ROLES={
 precast:role(.3,-25,'magic'),charging:role(1.2,-27,'magic',{loop:true}),casting:role(.38,-22,'sfx'),
 traveling:role(1.2,-26,'magic',{loop:true}),material:role(1.2,-24,'sfx',{repeated:true,domain:true}),
 motion:role(1.5,-26,'magic'),environment:role(2,-31,'ambience',{loop:true,domain:true}),
 secondary:role(.9,-27,'sfx',{repeated:true,domain:true}),riser:role(.8,-23,'magic'),
 impact:role(3.2,-19,'impact',{priority:100}),shockwave:role(1.2,-25,'impact'),
 aftermath:role(3.6,-30,'ambience'),rune:role(.48,-29,'magic',{repeated:true}),
 ui:role(.09,-34,'ui'),drone:role(2,-34,'drone',{loop:true}),
};
export const CUE_REGISTRY=Object.entries(ELEMENT_AUDIO).flatMap(([element,profile],index)=>Object.entries(CUE_ROLES).map(([role,definition],r)=>({
 id:`${element.toLowerCase()}/${role}`,element,role,profile,...definition,seed:120701+index*1009+r*71,variants:definition.repeated?4:3,
 priority:definition.priority??({casting:80,riser:85,rune:45,material:55,secondary:35,charging:50,traveling:40,environment:8,drone:4,ui:60}[role]||30),
 wet:role==='impact'?.08:['aftermath','environment','drone'].includes(role)?.45:.18,
 thresholds:{peakDbMax:-.5,truePeakDbMax:-.2,rmsToleranceDb:2.8,dcMax:.002,seamMax:.02,tailDropDb:15},
})));
export const getCue=(element,role)=>CUE_REGISTRY.find(c=>c.element===element&&c.role===role);
