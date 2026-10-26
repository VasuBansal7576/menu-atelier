let ready;
async function loadPDF() {
  if(!ready) ready=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='./vendor/jspdf.umd.min.js';script.onload=()=>resolve(globalThis.jspdf.jsPDF);script.onerror=()=>{ready=null;reject(new Error('The PDF library could not load. Please try again.'));};document.head.append(script);});
  return ready;
}
const supportedText = value => value.replace(/[✦✧]/g,'*').replace(/₹/g,'INR ').replace(/[—–]/g,'-').replace(/[’‘]/g,"'").replace(/[“”]/g,'"').replace(/\u202f/g,' ');
export function unsupportedCharacters(menu) {
  const content=[menu.name,menu.subtitle,menu.footer,...menu.sections.flatMap(s=>[s.name,...s.items.flatMap(i=>[i.name,i.description,...i.tags])])].join('');
  return [...new Set([...content].filter(c=>!/[\u0020-\u007e\u00a0-\u00ff\u0152\u0153\u0160\u0161\u0178\u017d\u017e\u20ac\u20b9\u2013\u2014\u2018\u2019\u201c\u201d\u2022\u2026\u202f\n\r\t]/.test(c)))];
}
export async function createPDF(pages, title='Menu') {
  const jsPDF=await loadPDF();
  return renderPDF(jsPDF,pages,title);
}
export function renderPDF(jsPDF,pages,title='Menu') {
  const doc=new jsPDF({unit:'pt',format:[pages[0].width,pages[0].height],compress:true,putOnlyUsedFonts:true});
  doc.setProperties({title,subject:'Editable menu designed with Menu Atelier',creator:'Menu Atelier'});
  pages.forEach((page,index)=>{
    if(index)doc.addPage([page.width,page.height]);
    for(const e of page.elements) {
      if(e.type==='text') {doc.setFont(e.font==='sans'?'helvetica':'times',e.style||'normal');doc.setFontSize(e.size);doc.setTextColor(e.color);doc.text(supportedText(e.value),e.x,e.y,{align:e.align||'left'});}
      else if(e.type==='line'){doc.setDrawColor(e.color);doc.setLineWidth(e.width);doc.line(e.x1,e.y1,e.x2,e.y2);}
      else if(e.type==='rect'){if(e.fill)doc.setFillColor(e.fill);if(e.stroke)doc.setDrawColor(e.stroke);doc.setLineWidth(.7);if(e.radius)doc.roundedRect(e.x,e.y,e.width,e.height,e.radius,e.radius,e.fill&&e.stroke?'FD':e.fill?'F':'S');else doc.rect(e.x,e.y,e.width,e.height,e.fill&&e.stroke?'FD':e.fill?'F':'S');}
      else if(e.type==='ellipse'){if(e.fill)doc.setFillColor(e.fill);if(e.stroke)doc.setDrawColor(e.stroke);doc.setLineWidth(.6);doc.ellipse(e.cx,e.cy,e.rx,e.ry,e.fill&&e.stroke?'FD':e.fill?'F':'S');}
    }
  });
  return doc;
}
export function downloadBlob(blob,name) {const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
