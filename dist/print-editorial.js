import { BODY, PRICE, text, line, rect, textWidth, inkBounds, dishBlock, measuredLines, stackLines, runBottom, freeze } from './print-kit.js';
const runs = (v,w,s,f) => stackLines(measuredLines(v,w,s,f),2);
const paint = (p,rs,x,y,c,extra={}) => rs.forEach(r=>text(p,r.value,x,y+r.y,r.size,r.font,c,extra));
const styles={
 atelier:{name:'Maison',cols:2,title:'cormorant-semibold',titleSize:49,heading:'cormorant-medium-italic',sectionSize:23,item:'cormorant-semibold',paper:'#FFFDF7',ink:'#242B28',accent:'#805443',gap:32,center:true},
 trattoria:{name:'Carta',cols:1,title:'fraunces-display',titleSize:38,heading:PRICE,sectionSize:12,item:'cormorant-semibold',paper:'#F8F4E8',ink:'#252F29',accent:'#9A3D2C',gap:30,rows:true},
 botanical:{name:'Gazette',cols:3,title:'cormorant-semibold',titleSize:42,heading:'cormorant-medium-italic',sectionSize:23,item:'cormorant-semibold',paper:'#FCFAF2',ink:'#293D34',accent:'#496554',gap:27,center:true},
 midnight:{name:'Service',cols:2,title:'bebas-neue',titleSize:44,heading:'cormorant-medium-italic',sectionSize:25,item:'source-sans-semibold',paper:'#F8F7EF',ink:'#182C34',accent:'#956348',gap:42,asymmetric:true}
};
export function layoutEditorial(menu,settings={},variant='atelier') {
 const t=styles[variant]||styles.atelier,land=variant==='botanical'||variant==='midnight',stock=settings.pageSize==='letter'?'letter':'a4';
 let [w,h]=stock==='letter'?[612,792]:[595.28,841.89];if(land)[w,h]=[h,w];
 const palette=settings.recipe?.palette||{},paper=palette.paper||palette.background||t.paper,ink=palette.ink||t.ink,accent=palette.accent||t.accent;
 const m=36,full=w-2*m,cw=(full-(t.cols-1)*t.gap)/t.cols;
 let ts=t.titleSize,title;
 do{title=runs(menu.name,full,ts,t.title);if(title.length<=2)break;ts-=2;}while(ts>20);
 const subtitle=runs(menu.subtitle,full,10.5,BODY),titleTop=36,subTop=titleTop+runBottom(title)+12;
 const bodyTop=Math.max(125,subTop+runBottom(subtitle)+30),foot=runs(menu.footer,full-70,8,BODY),footerTop=h-32-runBottom(foot),bodyBottom=footerTop-23;
 if(bodyBottom-bodyTop<110)throw new Error('The identity or footer is too long for readable paper.');
 let gap=settings.density==='compact'?10:settings.density==='spacious'?22:14;
 const blocks=menu.sections.map((s,si)=>({s,si,items:s.items.map(i=>dishBlock({...i,currency:menu.currency},cw,t.rows?18:15.8,10.8,{nameFont:t.item}))}));
 const total=blocks.reduce((sum,b)=>sum+39+b.items.reduce((a,d)=>a+d.height+gap,0)+16,0),capacity=bodyBottom-bodyTop;
 if(!land&&t.cols===2&&total<capacity*1.1&&settings.density!=='compact')gap=Math.max(gap,24);
 const columnTarget=Math.min(capacity,Math.max(120,total/t.cols+12));
 let p,col=0,y=bodyTop;const pages=[];
 const x=()=>m+col*(cw+t.gap);
 function newPage(){
 p={width:w,height:h,template:variant,compositionName:t.name,designSystem:'editorial-v2',format:{width:w,height:h,orientation:land?'landscape':'portrait',stock,label:`${stock==='letter'?'US Letter':'A4'} ${land?'landscape':'portrait'}`},bodyTop,bodyBottom,elements:[],hits:[],blocks:[]};
 rect(p,0,0,w,h,paper);
 const center=t.center;
 if(center){for(const r of title)text(p,r.value,w/2,titleTop+r.y,r.size,r.font,ink,{align:'center',role:'masthead'});for(const r of subtitle)text(p,r.value,w/2,subTop+r.y,r.size,r.font,ink,{align:'center',role:'subtitle'});}
 else {paint(p,title,m,titleTop,ink,{role:'masthead'});paint(p,subtitle,m,subTop,ink,{role:'subtitle'});}
 line(p,m,bodyTop-17,w-m,bodyTop-17,ink,1.1);line(p,m,bodyTop-13,w-m,bodyTop-13,ink,.35);
 if(t.asymmetric)text(p,'MENU',w-m,bodyTop-25,10,PRICE,accent,{align:'right',role:'edition'});
 for(let c=1;c<t.cols;c++)line(p,m+c*(cw+t.gap)-t.gap/2,bodyTop,m+c*(cw+t.gap)-t.gap/2,bodyBottom,'#D6D3C8',.4);
 line(p,m,footerTop-11,w-m,footerTop-11,ink,.5);paint(p,foot,m,footerTop,ink,{role:'footer'});
 pages.push(p);col=0;y=bodyTop;
 }
 function next(){if(col<t.cols-1){col++;y=bodyTop;}else newPage();}
 function heading(s,continued){const rs=runs(s.name+(continued?' (continued)':''),cw,t.sectionSize,t.heading),hh=runBottom(rs)+19;paint(p,rs,x(),y,accent,{sectionId:s.id,role:'category'});y+=hh;return hh;}
 function draw(s,b,rs=b.runs){const top=y;for(const r of rs)text(p,r.value,x()+(r.align==='right'?cw:0),top+r.y,r.size,r.font,r.role==='price'?accent:ink,{align:r.align,role:r.role,itemId:b.item.id,sectionId:s.id});const bottom=top+runBottom(rs);p.hits.push({id:b.item.id,sectionId:s.id,label:b.item.name,x:x()-2,y:top,width:cw+4,height:bottom-top+2});p.blocks.push({id:b.item.id,sectionId:s.id,x:x(),top,bottom,width:cw,priceGutter:b.gutter});if(t.rows)line(p,x(),bottom+gap/2,x()+cw,bottom+gap/2,'#D6D3C8',.35);y=bottom+gap;}
 newPage();
 for(const {s,items} of blocks){
 const hh=runBottom(runs(s.name,cw,t.sectionSize,t.heading))+19,group=hh+items.reduce((a,b)=>a+b.height+gap,0)+16;
 if(y>bodyTop&&((col<t.cols-1&&group<=capacity&&y+group>bodyTop+columnTarget)||(y+hh+(items[0]?.height||0)>bodyBottom)))next();
 heading(s,false);
 for(const b of items){
 if(b.height<=capacity-hh){if(y+b.height+2>bodyBottom){next();heading(s,true);}draw(s,b);}
 else {let remain=b.runs.map(r=>({...r}));while(remain.length){const fit=remain.filter(r=>y+r.y+inkBounds(r.value,r.size,r.font).bottom+2<=bodyBottom);if(!fit.length){next();heading(s,true);if(bodyBottom-y<30)throw new Error('This heading leaves no room for readable dishes.');continue;}draw(s,b,fit);remain=remain.filter(r=>!fit.includes(r));if(remain.length){const offset=Math.min(...remain.map(r=>r.y+inkBounds(r.value,r.size,r.font).top));remain=remain.map(r=>({...r,y:r.y-offset}));next();heading(s,true);}}}
 }y+=17;
 }
 pages.forEach((p,i)=>{text(p,menu.currency,w-m,footerTop+8,8,PRICE,ink,{align:'right',role:'currency'});text(p,`${i+1} / ${pages.length}`,w-m,h-22,8,PRICE,ink,{align:'right',role:'counter'});for(const e of p.elements.filter(e=>e.type==='text'))if(e.inkBounds.left<12||e.inkBounds.right>w-12||e.inkBounds.top<12||e.inkBounds.bottom>h-10)throw new Error('The menu text cannot fit the paper at a readable size.');});
 return freeze(pages);
}
