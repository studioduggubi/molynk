(function(){
 'use strict';
 const catalog=JSON.parse(document.getElementById('price-data').textContent);
 const byId=new Map(catalog.map(p=>[String(p.id),p]));
 const search=document.getElementById('product-search'),clear=document.getElementById('clear-search');
 const sections=[...document.querySelectorAll('.price-group')];
 const rangeButtons=[...document.querySelectorAll('[data-range]')];
 const viewButtons=[...document.querySelectorAll('[data-view]')];
 const dialog=document.getElementById('product-dialog');
 const normal=value=>String(value).normalize('NFKC').toLocaleLowerCase('ko-KR').replace(/[\s,·\-]/g,'');
 const money=value=>Number(value).toLocaleString('ko-KR')+'원';
 const inRange=(price,range)=>range==='all'||(range==='high'?price>=50000:Math.floor(price/10000)===Number(range));
 const matches=(product,query)=>query.trim().split(/\s+/).filter(Boolean).every(term=>normal(product.name+' '+product.price+'원').includes(normal(term)));
 let selectedRange='all',returnFocus=null;
 function updateArrows(section){
  const rail=section.querySelector('.product-rail');
  section.querySelector('[data-scroll="-1"]').disabled=rail.scrollLeft<3;
  section.querySelector('[data-scroll="1"]').disabled=rail.scrollLeft+rail.clientWidth>=rail.scrollWidth-3;
 }
 function render(){
  let count=0,groups=0;
  for(const section of sections){
   let visible=0;
   for(const card of section.querySelectorAll('.product-card')){
    const product=byId.get(card.dataset.product);
    card.hidden=!inRange(product.price,selectedRange)||!matches(product,search.value);
    if(!card.hidden){visible++;count++;}
   }
   section.hidden=visible===0;
   section.querySelector('.group-count').textContent=visible+'개 상품';
   if(visible)groups++;
   section.querySelector('.product-rail').scrollLeft=0;
   updateArrows(section);
  }
  clear.hidden=!search.value;
  document.getElementById('result-count').textContent=count+'개 상품 · '+groups+'가지 가격';
  document.getElementById('empty').hidden=count!==0;
  const url=new URL(location.href);
  if(search.value)url.searchParams.set('q',search.value);else url.searchParams.delete('q');
  if(selectedRange!=='all')url.searchParams.set('range',selectedRange);else url.searchParams.delete('range');
  history.replaceState(null,'',url);
 }
 function setRange(range){selectedRange=range;rangeButtons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.range===range)));}
 search.addEventListener('input',render);
 clear.addEventListener('click',()=>{search.value='';render();search.focus();});
 rangeButtons.forEach(button=>button.addEventListener('click',()=>{setRange(button.dataset.range);render();}));
 viewButtons.forEach(button=>button.addEventListener('click',()=>{
  const compact=button.dataset.view==='compact';document.getElementById('groups').classList.toggle('compact',compact);
  viewButtons.forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  sections.forEach(updateArrows);
 }));
 document.getElementById('reset-filters').addEventListener('click',()=>{search.value='';setRange('all');render();search.focus();});
 document.getElementById('price-jump').addEventListener('change',event=>{
  if(!event.target.value)return;
  search.value='';setRange('all');render();
  const target=document.getElementById('price-'+event.target.value);target.scrollIntoView({block:'start'});
  history.replaceState(null,'','#'+target.id);event.target.value='';
 });
 for(const section of sections){
  const rail=section.querySelector('.product-rail');
  rail.addEventListener('scroll',()=>updateArrows(section),{passive:true});
  section.querySelectorAll('[data-scroll]').forEach(button=>button.addEventListener('click',()=>rail.scrollBy({left:Number(button.dataset.scroll)*(rail.querySelector('.product-card:not([hidden])')?.getBoundingClientRect().width+16||rail.clientWidth*.85),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})));
 }
 document.querySelectorAll('[data-open]').forEach(button=>button.addEventListener('click',()=>{
  const product=byId.get(button.dataset.open);returnFocus=button;
  const img=document.getElementById('dialog-image');img.src=product.image;img.alt=product.name+(product.shared_image?' · 제품군 공통 사진':'');
  document.getElementById('dialog-title').textContent=product.name;
  document.getElementById('dialog-price').textContent=money(product.price);
  const note=document.getElementById('dialog-note');note.hidden=!product.shared_image;note.textContent='여러 옵션이 함께 담긴 제품군 공통 사진입니다. 상품명과 랜덤·세트 구분을 함께 확인해주세요.';
  dialog.showModal();document.body.style.overflow='hidden';
 }));
 document.getElementById('dialog-close').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
 dialog.addEventListener('close',()=>{document.body.style.overflow='';returnFocus?.focus({preventScroll:true});});
 window.addEventListener('resize',()=>sections.forEach(updateArrows),{passive:true});
 const initial=new URL(location.href);search.value=initial.searchParams.get('q')||'';
 if(rangeButtons.some(b=>b.dataset.range===initial.searchParams.get('range')))setRange(initial.searchParams.get('range'));
 render();
})();
