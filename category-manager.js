/* Rebeca Fotografia · interactive Studio category organizer */
window.RebecaCategoryManager=(()=>{
  const escape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
  const normalized=v=>Array.isArray(v)?v.filter(x=>typeof x==='string'):typeof v==='string'&&v?[v]:[];
  const unique=arr=>[...new Set(arr)];
  const el=(r,s)=>r.querySelector(s);
  function mount(root,current,{api,toast,refresh}){
    if(!root)return;
    const categories={
      photos:unique(normalized(current.categories?.photos)),
      videos:unique(normalized(current.categories?.videos))
    };
    const assignments={};
    for(const [name,list] of Object.entries(current.assignments||{}))assignments[name]=unique(normalized(list));
    const media=(current.media||[]).filter(m=>m.type==='photo'||m.type==='video');
    let type='photos',active='',selected=new Set(),drag=false,paint=false,paintAdd=true,busy=false,dirty=false;
    const namesFor=()=>media.filter(m=>m.type===(type==='photos'?'photo':'video'));
    function setDirty(){dirty=true;el(root,'[data-save]').textContent='Salvar alterações *'}
    root.innerHTML='<div class="studio-cats"><div class="studio-heading"><div><span class="studio-kicker">ORGANIZAÇÃO DO ÁLBUM</span><h2>Categorias & seleção</h2><p class="adminHint">Crie quantas categorias precisar. Selecione uma ou várias fotos e atribua à categoria desejada.</p></div></div><div class="studio-type"><button type="button" data-type="photos">Fotografias</button><button type="button" data-type="videos">Vídeos</button></div><div class="studio-create"><input data-newcat placeholder="Nome da categoria, ex.: Making of" maxlength="50" aria-label="Nova categoria"><button type="button" class="pill dark" data-add>+ Criar categoria</button></div><div class="studio-categories" data-categories></div><div class="studio-selection"><strong data-count>0 selecionadas</strong><div class="studio-selection-actions"><button type="button" class="pill" data-select-all>Selecionar todas</button><button type="button" class="pill" data-clear>Limpar seleção</button><button type="button" class="pill" data-paint aria-pressed="false">Arrastar para selecionar</button></div></div><div class="studio-batch"><span data-category-hint>Escolha uma categoria para organizar as fotos.</span><div class="studio-batch-actions"><button type="button" class="pill dark" data-apply>Adicionar à categoria</button><button type="button" class="pill" data-unassign>Remover da categoria</button><button type="button" class="pill" data-delete-category>Excluir categoria</button></div></div><div class="studio-media-grid" data-grid></div><div class="studio-save"><span class="adminHint">As fotos permanecem no álbum. As categorias são apenas uma organização.</span><button type="button" class="pill dark" data-save>Salvar alterações</button></div></div>';
    const list=el(root,'[data-categories]'),grid=el(root,'[data-grid]'),count=el(root,'[data-count]');
    const renderControls=()=>{
      root.querySelectorAll('[data-type]').forEach(b=>b.classList.toggle('active',b.dataset.type===type));
      list.innerHTML='<button type="button" class="studio-chip '+(!active?'active':'')+'" data-cat="">Todas '+(type==='photos'?'as fotos':'os vídeos')+'</button>'+categories[type].map(c=>'<button type="button" class="studio-chip '+(active===c?'active':'')+'" data-cat="'+escape(c)+'">'+escape(c)+'</button>').join('');
      el(root,'[data-category-hint]').textContent=active?'Categoria: '+active:'Selecione uma categoria acima para atribuir as mídias.';
      el(root,'[data-apply]').disabled=!active||!selected.size;
      el(root,'[data-unassign]').disabled=!active||!selected.size;
      el(root,'[data-delete-category]').disabled=!active;
      el(root,'[data-paint]').classList.toggle('active',paint);
      el(root,'[data-paint]').setAttribute('aria-pressed',String(paint));
      grid.classList.toggle('paint-mode',paint);
      updateSelection();
    };
    const updateSelection=()=>{
      count.textContent=selected.size+' '+(selected.size===1?'selecionada':'selecionadas');
      root.querySelectorAll('[data-media]').forEach(item=>{const value=selected.has(item.dataset.media);item.classList.toggle('checked',value);item.setAttribute('aria-pressed',String(value));const check=item.querySelector('.studio-check');if(check)check.textContent=value?'✓':'+'});
      el(root,'[data-select-all]').textContent=namesFor().every(m=>selected.has(m.name))&&namesFor().length?'Desmarcar todas':'Selecionar todas';
      el(root,'[data-apply]').disabled=!active||!selected.size;
      el(root,'[data-unassign]').disabled=!active||!selected.size
    };
    function renderGrid(){
      const list=namesFor();
      grid.innerHTML=list.length?list.map(m=>{
        const labels=(assignments[m.name]||[]).filter(c=>categories[type].includes(c));
        const url=new URL('albums/'+encodeURIComponent(current.slug)+'/'+encodeURIComponent(m.name),new URL('.',location.href)).href;
        return '<button type="button" class="studio-photo '+(selected.has(m.name)?'checked':'')+'" data-media="'+escape(m.name)+'" aria-label="Selecionar '+escape(m.name)+'" aria-pressed="'+selected.has(m.name)+'">'+(m.type==='photo'?'<img src="'+escape(url)+'" loading="lazy" draggable="false" alt="">':'<video src="'+escape(url)+'#t=0.1" muted playsinline preload="metadata"></video>')+'<span class="studio-check">'+(selected.has(m.name)?'✓':'+')+'</span><span class="studio-filetag">'+escape(m.name)+'</span>'+(labels.length?'<span class="studio-tags">'+labels.map(c=>'<span>'+escape(c)+'</span>').join('')+'</span>':'')+'</button>';
      }).join(''):'<p class="adminHint">Ainda não há '+(type==='photos'?'fotos':'vídeos')+' neste álbum.</p>';
      renderControls();
    }
    function setSelected(name,val){if(val)selected.add(name);else selected.delete(name);updateSelection()}
    function categoryChange(name){active=name;renderControls()}
    list.addEventListener('click',e=>{const b=e.target.closest('[data-cat]');if(b)categoryChange(b.dataset.cat)});
    root.querySelectorAll('[data-type]').forEach(b=>b.addEventListener('click',()=>{type=b.dataset.type;active='';selected.clear();renderGrid()}));
    el(root,'[data-add]').onclick=()=>{
      const input=el(root,'[data-newcat]'),name=input.value.trim().replace(/\s+/g,' ');
      if(!name)return toast('Digite o nome da categoria.');
      if(categories[type].some(c=>c.toLocaleLowerCase('pt-BR')===name.toLocaleLowerCase('pt-BR')))return toast('Esta categoria já existe.');
      if(categories[type].length>=40)return toast('Limite de 40 categorias por tipo.');
      categories[type].push(name);active=name;input.value='';setDirty();renderControls();toast('Categoria criada. Selecione as fotos e salve no final.');
    };
    el(root,'[data-newcat]').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();el(root,'[data-add]').click()}});
    el(root,'[data-select-all]').onclick=()=>{const files=namesFor();if(files.every(m=>selected.has(m.name)))files.forEach(m=>selected.delete(m.name));else files.forEach(m=>selected.add(m.name));updateSelection()};
    el(root,'[data-clear]').onclick=()=>{selected.clear();updateSelection()};
    el(root,'[data-paint]').onclick=()=>{paint=!paint;renderControls();toast(paint?'Arraste o dedo ou mouse sobre as fotos para selecionar.':'Modo arrastar desativado.')};
    grid.addEventListener('click',e=>{if(Date.now()<grid._suppressUntil)return;const item=e.target.closest('[data-media]');if(!item)return;const name=item.dataset.media;setSelected(name,!selected.has(name))});
    grid.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0||e.isPrimary===false||(!paint&&e.pointerType!=='mouse'))return;const item=e.target.closest('[data-media]');if(!item)return;drag=true;paintAdd=!selected.has(item.dataset.media);setSelected(item.dataset.media,paintAdd);grid._suppressUntil=Date.now()+650;if(e.pointerType==='touch')e.preventDefault()});
    grid.addEventListener('pointermove',e=>{if(!drag)return;const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-media]');if(target&&grid.contains(target))setSelected(target.dataset.media,paintAdd)});
    for(const name of ['pointerup','pointercancel','lostpointercapture'])grid.addEventListener(name,()=>{drag=false});
    const apply=(adding)=>{
      if(!active||!selected.size)return;
      for(const name of selected){const tags=new Set(assignments[name]||[]);if(adding)tags.add(active);else tags.delete(active);assignments[name]=[...tags]}
      setDirty();renderGrid();toast(adding?'Fotos adicionadas à categoria.':'Fotos removidas da categoria.');
    };
    el(root,'[data-apply]').onclick=()=>apply(true);
    el(root,'[data-unassign]').onclick=()=>apply(false);
    el(root,'[data-delete-category]').onclick=()=>{
      if(!active)return;if(!confirm('Excluir a categoria "'+active+'"? As fotos não serão apagadas.'))return;
      categories[type]=categories[type].filter(x=>x!==active);
      for(const name of Object.keys(assignments)){const entry=media.find(m=>m.name===name);if(entry?.type===(type==='photos'?'photo':'video'))assignments[name]=assignments[name].filter(x=>x!==active)}
      active='';setDirty();renderGrid()
    };
    el(root,'[data-save]').onclick=async()=>{
      if(busy)return;busy=true;const button=el(root,'[data-save]');button.disabled=true;button.textContent='Salvando…';
      try{
        const form=document.querySelector('#albumForm')?.elements;
        const b={slug:current.slug,title:form?.namedItem('title').value||current.title,subtitle:form?.namedItem('subtitle').value||'',font:form?.namedItem('font').value||'serif',scale:Number(form?.namedItem('scale').value)||1,cover:form?.namedItem('cover').value||'',videoCover:form?.namedItem('videoCover').value||'',categories,assignments};
        await api('/api/admin/album',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(b)});
        dirty=false;toast('Categorias e fotos organizadas com sucesso.');await refresh()
      }catch(err){toast(err.message)}finally{busy=false;button.disabled=false;button.textContent=dirty?'Salvar alterações *':'Salvar alterações'}
    };
    renderGrid();
  }
  return {mount};
})();