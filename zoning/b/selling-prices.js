(function(root){
 'use strict';
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=value=>Number(value).toLocaleString('ko-KR')+'원';
 const items=(product,catalog)=>(product.sale_rows||[]).map(index=>catalog[index]).filter(Boolean);
 function summary(product,catalog){
  const rows=items(product,catalog);if(!rows.length)return '판매가 확인 필요';
  const prices=[...new Set(rows.map(row=>row.price))];
  if(prices.length===1)return (rows.length>1?'각 ':'')+money(prices[0]);
  return money(Math.min(...prices))+' ~ '+money(Math.max(...prices));
 }
 function render(product,catalog){
  const rows=items(product,catalog);
  const heading=`<p class="sale-price${rows.length?'':' price-pending'}"><span>판매가</span><strong>${esc(summary(product,catalog))}</strong></p>`;
  if(!rows.length)return heading+'<small class="sale-missing">최종 엑셀에서 대응 상품을 확인하지 못했습니다.</small>';
  if(rows.length===1)return heading;
  return heading+`<details class="sale-options"><summary>상품명·판매가 ${rows.length}개 보기</summary><ul>${rows.map(row=>`<li><span>${esc(row.name)}</span><b>${money(row.price)}</b></li>`).join('')}</ul></details>`;
 }
 function catalogRows(catalog){
  return catalog.map((row,index)=>`<tr data-sale-name="${esc(row.name)}" data-sale-index="${index}"><td>${esc(row.name)}</td><td><strong>${money(row.price)}</strong></td></tr>`).join('');
 }
 function inventoryRows(data){
  return Object.values(data.products).map(p=>{
   const saleNames=items(p,data.sales_catalog).map(item=>item.name).join(' ');
   const stations=p.display_stations.map(n=>`<button type="button" class="stand-link" data-jump="${n}">${n}</button>`).join(' ');
   const source=p.source_rows.map(row=>`p.${row.page} · 행${row.row} · ${row.quantity}`).join('<br>')||'대응 주문행 확인 필요';
   const count=(amount,conditional,unit)=>`${amount}${unit}${conditional?' + 확인 후 '+conditional+unit:''}`;
   return `<tr data-inventory-name="${esc(p.name+' '+saleNames)}"><td><div class="inventory-name"><button type="button" data-image="${esc(p.key)}" aria-label="${esc(p.name)} 참고 이미지 확대"><img src="${esc(p.image)}" alt="${esc(p.name)} 진열 참고 이미지" loading="lazy" width="240" height="240"></button><span><b>${esc(p.name)}</b><small>${stations} 전시 매대</small></span></div></td><td>${render(p,data.sales_catalog)}</td><td><b>${esc(p.quantity_label)}</b><small>${esc(p.quantity_note)}</small></td><td><span class="badge">${esc(p.status)}</span><small>${source}</small></td><td>${count(p.samples,p.conditional_samples,'개')}</td><td>${p.purchase_at==='캐셔'?'캐셔 전달':count(p.purchase,p.conditional_purchase,'포장')+' · '+p.purchase_at+'번'}</td></tr>`;
  }).join('');
 }
 const api={esc,money,items,summary,render,catalogRows,inventoryRows};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.MolynkSales=api;
})(typeof window!=='undefined'?window:globalThis);
