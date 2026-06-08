import { useState, useEffect, useRef, useCallback } from "react"

const API = import.meta.env.VITE_API_URL || "http://localhost:8000"

const NODE_COLORS = {
  PolicyMaker:       "#E8772E",
  PoliticalParty:    "#7F77DD",
  PAC:               "#C2410C",
  LobbyGroup:        "#BA7517",
  MediaOutlet:       "#A32D2D",
  Corporation:       "#1D9E75",
  Foundation:        "#D4537E",
  GovernmentAgency:  "#0F6E56",
  Person:            "#D85A30",
  InvestorInstitution:"#534AB7",
}

const EDGE_COLORS = {
  FINANZIA_OCCULTO:  "#E24B4A",
  CONTROLLA_MEDIA:   "#E24B4A",
  REVOLVING_DOOR:    "#EF9F27",
  RETE_INFORMALE:    "#EF9F27",
  LOBBYING_SU:       "#BA7517",
  FINANZIA_CAMPAGNA: "#E8772E",
  DONA_A_PAC:        "#C2410C",
  ALLEATO_DI:        "#1D9E75",
  OPPOSTO_A:         "#888780",
  NOMINA:            "#7F77DD",
  CITA_POSITIVO:     "#1D9E75",
  CITA_NEGATIVO:     "#A32D2D",
}

const SEV_COLOR = { CRITICAL:"#E24B4A", HIGH:"#EF9F27", MEDIUM:"#E8772E", LOW:"#1D9E75" }
const CAT_ICON = { POLICY:"⚖️", ELECTION:"🗳️", APPOINTMENT:"👤", REGULATION:"📋", ALLIANCE:"🤝", FINANCIAL:"💰" }

function hiddenColor(score) {
  if (score >= 80) return "#E24B4A"
  if (score >= 60) return "#EF9F27"
  if (score >= 40) return "#BA7517"
  return "#1D9E75"
}

export default function App() {
  const canvasRef = useRef(null)
  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])
  const [hiddenNets, setHiddenNets] = useState([])
  const [alerts, setAlerts] = useState([])
  const [stats, setStats] = useState({})
  const [selected, setSelected] = useState(null)
  const [nodeDetails, setNodeDetails] = useState(null)
  const [tab, setTab] = useState("graph")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState("")
  const [showHidden, setShowHidden] = useState(false)

  const posRef = useRef({})
  const velRef = useRef({})
  const animRef = useRef(null)
  const hovRef = useRef(null)
  const dragRef = useRef(null)
  const dragOffRef = useRef({x:0,y:0})

  const fetchData = useCallback(async () => {
    try {
      const [gRes, hnRes, aRes, sRes] = await Promise.all([
        fetch(`${API}/api/graph`),
        fetch(`${API}/api/hidden-networks`),
        fetch(`${API}/api/alerts`),
        fetch(`${API}/api/stats`),
      ])
      const g = await gRes.json()
      const alertsData = await aRes.json() || []
      setNodes(g.nodes||[]); setEdges(g.edges||[])
      setHiddenNets(await hnRes.json()||[])
      setAlerts(alertsData)
      setStats(await sRes.json()||{})
      setLoading(false)
    } catch(e) { console.error(e); setLoading(false) }
  }, [])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await fetch(`${API}/api/refresh`, {method:"POST"})
      setTimeout(fetchData, 8000)
      setTimeout(()=>{ fetchData(); setRefreshing(false) }, 15000)
    } catch(e) { setRefreshing(false) }
  }, [fetchData])

  useEffect(()=>{ fetchData() },[fetchData])

  useEffect(()=>{
    if(nodes.length===0) return
    const cx=350,cy=260
    nodes.forEach((n,i)=>{
      if(!posRef.current[n.id]){
        const angle=(i/nodes.length)*Math.PI*2
        const rad=156
        posRef.current[n.id]={x:cx+Math.cos(angle)*rad+(Math.random()-.5)*80,y:cy+Math.sin(angle)*rad+(Math.random()-.5)*80}
        velRef.current[n.id]={vx:0,vy:0}
      }
    })
  },[nodes])

  useEffect(()=>{
    if(nodes.length===0) return
    const visibleEdges = showHidden ? edges : edges.filter(e=>(e.hidden_score||0)<50)
    let tick=0

    function start(){
      const canvas=canvasRef.current
      if(!canvas){ animRef.current=requestAnimationFrame(start); return }
      canvas.width=700; canvas.height=520
      const ctx=canvas.getContext("2d")

      function force(){
        const W=canvas.width,H=canvas.height,cx=W/2,cy=H/2
        nodes.forEach(a=>{
          const pa=posRef.current[a.id]; if(!pa) return
          const va=velRef.current[a.id]||{vx:0,vy:0}
          nodes.forEach(b=>{
            if(a.id===b.id) return
            const pb=posRef.current[b.id]; if(!pb) return
            const dx=pa.x-pb.x,dy=pa.y-pb.y,dist=Math.sqrt(dx*dx+dy*dy)||1
            const f=5500/(dist*dist)
            va.vx+=(dx/dist)*f; va.vy+=(dy/dist)*f
          })
          va.vx+=(cx-pa.x)*0.004; va.vy+=(cy-pa.y)*0.004
          velRef.current[a.id]=va
        })
        visibleEdges.forEach(e=>{
          const ps=posRef.current[e.source],pt=posRef.current[e.target]
          if(!ps||!pt) return
          const vs=velRef.current[e.source]||{vx:0,vy:0}
          const vt=velRef.current[e.target]||{vx:0,vy:0}
          const dx=pt.x-ps.x,dy=pt.y-ps.y,dist=Math.sqrt(dx*dx+dy*dy)||1
          const f=(dist-140)*0.014
          vs.vx+=(dx/dist)*f; vs.vy+=(dy/dist)*f
          vt.vx-=(dx/dist)*f; vt.vy-=(dy/dist)*f
        })
        nodes.forEach(n=>{
          if(n.id===dragRef.current?.id) return
          const p=posRef.current[n.id],v=velRef.current[n.id]; if(!p||!v) return
          v.vx*=0.75; v.vy*=0.75
          p.x=Math.max(50,Math.min(canvas.width-50,p.x+v.vx))
          p.y=Math.max(40,Math.min(canvas.height-40,p.y+v.vy))
        })
      }

      function draw(){
        ctx.clearRect(0,0,canvas.width,canvas.height)
        const sel=selected
        visibleEdges.forEach(e=>{
          const ps=posRef.current[e.source],pt=posRef.current[e.target]
          if(!ps||!pt) return
          const isHl=sel&&(e.source===sel||e.target===sel)
          const edgeColor=EDGE_COLORS[e.type]||(e.hidden_score>60?"#E24B4A":"#888")
          const isDashed=e.type==="RETE_INFORMALE"||e.type==="FINANZIA_OCCULTO"
          ctx.save()
          ctx.beginPath()
          ctx.moveTo(ps.x,ps.y); ctx.lineTo(pt.x,pt.y)
          if(isDashed) ctx.setLineDash([5,4])
          ctx.strokeStyle=isHl?edgeColor:edgeColor+(showHidden?"55":"22")
          ctx.lineWidth=isHl?2:0.8
          ctx.stroke()
          ctx.setLineDash([])
          if(isHl){
            const mx=(ps.x+pt.x)/2,my=(ps.y+pt.y)/2
            const angle=Math.atan2(pt.y-ps.y,pt.x-ps.x)
            ctx.beginPath()
            ctx.moveTo(mx-8*Math.cos(angle-.4),my-8*Math.sin(angle-.4))
            ctx.lineTo(mx,my)
            ctx.lineTo(mx-8*Math.cos(angle+.4),my-8*Math.sin(angle+.4))
            ctx.strokeStyle=edgeColor; ctx.lineWidth=1.5; ctx.stroke()
            ctx.font="10px sans-serif"; ctx.fillStyle=edgeColor
            ctx.textAlign="center"; ctx.fillText(e.type.replace(/_/g," "),mx,my-8)
          }
          ctx.restore()
        })
        nodes.forEach(n=>{
          const p=posRef.current[n.id]; if(!p) return
          const color=NODE_COLORS[n.type]||"#888"
          const isSel=n.id===sel
          const isHov=hovRef.current?.id===n.id
          const isConn=sel&&visibleEdges.some(e=>(e.source===sel&&e.target===n.id)||(e.target===sel&&e.source===n.id))
          const alpha=sel&&!isSel&&!isConn?.2:1
          const r=isSel?15:isHov?13:Math.max(7,Math.min(13,(n.influence_score||0)/8))
          ctx.save()
          ctx.globalAlpha=alpha
          if(n.hidden_score>50){
            ctx.beginPath(); ctx.arc(p.x,p.y,r+5,0,Math.PI*2)
            ctx.strokeStyle=hiddenColor(n.hidden_score)+"66"; ctx.lineWidth=2; ctx.stroke()
          }
          if(isSel||isHov){
            ctx.beginPath(); ctx.arc(p.x,p.y,r+7,0,Math.PI*2)
            ctx.fillStyle=color+"22"; ctx.fill()
          }
          ctx.beginPath(); ctx.arc(p.x,p.y,r,0,Math.PI*2)
          ctx.fillStyle=color; ctx.fill()
          ctx.strokeStyle="rgba(255,255,255,0.65)"; ctx.lineWidth=1.5; ctx.stroke()
          ctx.font=`${isSel?"500":"400"} 11px sans-serif`
          ctx.fillStyle="rgba(0,0,0,0.78)"; ctx.textAlign="center"
          ctx.fillText(n.label,p.x,p.y+r+13)
          ctx.restore()
        })
      }

      function loop(){
        if(tick<300){force();tick++}
        draw()
        animRef.current=requestAnimationFrame(loop)
      }
      animRef.current=requestAnimationFrame(loop)
    }

    animRef.current=requestAnimationFrame(start)
    return()=>cancelAnimationFrame(animRef.current)
  },[nodes,edges,selected,showHidden,tab])

  function toCanvasCoords(cssX,cssY){
    const canvas=canvasRef.current
    if(!canvas) return{x:cssX,y:cssY}
    const r=canvas.getBoundingClientRect()
    return{x:cssX*(canvas.width/r.width),y:cssY*(canvas.height/r.height)}
  }

  function getNodeAt(cssX,cssY){
    const{x,y}=toCanvasCoords(cssX,cssY)
    for(let i=nodes.length-1;i>=0;i--){
      const n=nodes[i],p=posRef.current[n.id]; if(!p) continue
      if(Math.sqrt((x-p.x)**2+(y-p.y)**2)<25) return n
    }
    return null
  }

  async function selectNode(n){
    setSelected(n?n.id:null)
    if(n){
      const res=await fetch(`${API}/api/node/${n.id}`)
      setNodeDetails(await res.json())
    } else setNodeDetails(null)
  }

  function onMouseDown(e){
    const r=e.currentTarget.getBoundingClientRect()
    const cssX=e.clientX-r.left,cssY=e.clientY-r.top
    const n=getNodeAt(cssX,cssY)
    if(n){dragRef.current=n;const{x,y}=toCanvasCoords(cssX,cssY);const p=posRef.current[n.id];dragOffRef.current={x:x-p.x,y:y-p.y}}
  }
  function onMouseMove(e){
    const r=e.currentTarget.getBoundingClientRect()
    const cssX=e.clientX-r.left,cssY=e.clientY-r.top
    if(dragRef.current){const{x,y}=toCanvasCoords(cssX,cssY);const p=posRef.current[dragRef.current.id];p.x=x-dragOffRef.current.x;p.y=y-dragOffRef.current.y;velRef.current[dragRef.current.id]={vx:0,vy:0}}
    else{hovRef.current=getNodeAt(cssX,cssY);e.currentTarget.style.cursor=hovRef.current?"pointer":"default"}
  }
  function onMouseUp(e){
    const r=e.currentTarget.getBoundingClientRect()
    const cssX=e.clientX-r.left,cssY=e.clientY-r.top
    const n=getNodeAt(cssX,cssY)
    const{x,y}=toCanvasCoords(cssX,cssY)
    const dragging=dragRef.current
    if(!dragging||Math.hypot(x-(posRef.current[dragging.id]?.x||0)-dragOffRef.current.x,y-(posRef.current[dragging.id]?.y||0)-dragOffRef.current.y)<5)
      selectNode(selected===n?.id?null:n)
    dragRef.current=null
  }

  const handleSearch = async(v)=>{
    setSearch(v)
    if(v.length>2){
      const res=await fetch(`${API}/api/search?q=${encodeURIComponent(v)}`)
      const found=await res.json()
      if(found.length>0) selectNode(found[0])
    }
  }

  const W=700,H=520

  return (
    <div style={{fontFamily:"var(--font-sans,sans-serif)",color:"var(--color-text-primary)",minHeight:"100vh",background:"var(--color-background-tertiary)"}}>
      <div style={{background:"var(--color-background-primary)",borderBottom:"0.5px solid var(--color-border-tertiary)",padding:"10px 20px",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:8,height:8,borderRadius:"50%",background:"#E8772E"}}/>
          <span style={{fontWeight:500,fontSize:15}}>USAINT</span>
          <span style={{fontSize:11,color:"var(--color-text-tertiary)",background:"var(--color-background-secondary)",padding:"2px 8px",borderRadius:4}}>US Political Intelligence Graph</span>
        </div>
        <div style={{display:"flex",gap:16,marginLeft:8}}>
          {[["graph","🕸 Grafo"],["predictions","🔮 Previsioni"],["hidden","👁 Reti Nascoste"],["alerts","⚠️ Alert"],["ranking","📊 Influenza"]].map(([k,v])=>(
            <button key={k} onClick={()=>setTab(k)} style={{background:"none",border:"none",cursor:"pointer",fontSize:12,fontWeight:tab===k?500:400,color:tab===k?"var(--color-text-primary)":"var(--color-text-secondary)",borderBottom:tab===k?"2px solid #E8772E":"2px solid transparent",paddingBottom:3}}>{v}</button>
          ))}
        </div>
        <input value={search} onChange={e=>handleSearch(e.target.value)} placeholder="Cerca attore..." style={{marginLeft:"auto",padding:"4px 10px",borderRadius:6,border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-secondary)",fontSize:12,width:160,color:"var(--color-text-primary)"}}/>
        <div style={{display:"flex",gap:8,alignItems:"center",fontSize:11,color:"var(--color-text-tertiary)"}}>
          {stats.unread_alerts>0&&<span style={{background:"#E24B4A",color:"#fff",borderRadius:10,padding:"2px 7px"}}>{stats.unread_alerts} alert</span>}
          <span>{stats.nodes} nodi · {stats.edges} relazioni · {stats.predictions||0} previsioni</span>
          <button onClick={handleRefresh} disabled={refreshing} style={{padding:"3px 10px",borderRadius:5,border:"0.5px solid var(--color-border-secondary)",background:refreshing?"#EF9F2722":"var(--color-background-secondary)",cursor:refreshing?"not-allowed":"pointer",fontSize:11,color:refreshing?"#EF9F27":"var(--color-text-secondary)"}}>
            {refreshing?"⏳ Aggiornamento...":"↻ Aggiorna"}
          </button>
        </div>
      </div>

      {loading&&<div style={{padding:40,textAlign:"center",color:"var(--color-text-secondary)"}}>Caricamento grafo politico...</div>}

      {!loading&&tab==="graph"&&(
        <div style={{display:"flex"}}>
          <div style={{flex:1,position:"relative"}}>
            <div style={{position:"absolute",top:10,left:10,zIndex:10,display:"flex",gap:8,alignItems:"center"}}>
              <div style={{background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:8,padding:"6px 10px",display:"flex",flexWrap:"wrap",gap:"4px 10px",maxWidth:360}}>
                {Object.entries(NODE_COLORS).map(([t,c])=>(
                  <div key={t} style={{display:"flex",alignItems:"center",gap:3,fontSize:10,color:"var(--color-text-secondary)"}}>
                    <div style={{width:6,height:6,borderRadius:"50%",background:c}}/>{t}
                  </div>
                ))}
              </div>
              <label style={{display:"flex",alignItems:"center",gap:5,fontSize:11,cursor:"pointer",background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:6,padding:"4px 10px",color:"var(--color-text-secondary)"}}>
                <input type="checkbox" checked={showHidden} onChange={e=>setShowHidden(e.target.checked)} style={{width:12,height:12}}/>
                Mostra relazioni nascoste
              </label>
            </div>
            <canvas ref={canvasRef} width={W} height={H} style={{width:"100%",height:520,display:"block"}}
              onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp}
              onMouseLeave={()=>{dragRef.current=null;hovRef.current=null}}/>
          </div>
          <div style={{width:250,borderLeft:"0.5px solid var(--color-border-tertiary)",background:"var(--color-background-primary)",padding:14,overflowY:"auto",maxHeight:520}}>
            {!nodeDetails&&<p style={{fontSize:12,color:"var(--color-text-tertiary)"}}>Clicca un nodo per dettagli</p>}
            {nodeDetails&&(
              <div>
                <div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap"}}>
                  <span style={{fontSize:11,padding:"2px 7px",borderRadius:4,background:NODE_COLORS[nodeDetails.node?.type]+"22",color:NODE_COLORS[nodeDetails.node?.type],fontWeight:500}}>{nodeDetails.node?.type}</span>
                  <span style={{fontSize:11,padding:"2px 7px",borderRadius:4,background:"#7F77DD22",color:"#534AB7"}}>Inf. {nodeDetails.node?.influence_score}</span>
                  <span style={{fontSize:11,padding:"2px 7px",borderRadius:4,background:hiddenColor(nodeDetails.node?.hidden_score)+"22",color:hiddenColor(nodeDetails.node?.hidden_score)}}>Hidden {nodeDetails.node?.hidden_score}</span>
                </div>
                <div style={{fontSize:15,fontWeight:500,marginBottom:4}}>{nodeDetails.node?.label}</div>
                {nodeDetails.node?.country&&<div style={{fontSize:11,color:"var(--color-text-tertiary)",marginBottom:8}}>🌍 {nodeDetails.node.country}</div>}
                <div style={{fontSize:12,color:"var(--color-text-secondary)",lineHeight:1.5,marginBottom:12}}>{nodeDetails.node?.description}</div>
                {nodeDetails.relations?.length>0&&(
                  <>
                    <div style={{fontSize:10,fontWeight:500,color:"var(--color-text-tertiary)",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:6}}>Relazioni ({nodeDetails.relations.length})</div>
                    {nodeDetails.relations.map((r,i)=>{
                      const isSrc=r.source===nodeDetails.node?.id
                      const other=isSrc?r.target_label:r.source_label
                      const ec=EDGE_COLORS[r.type]||"#888"
                      return(
                        <div key={i} style={{fontSize:11,padding:"5px 8px",borderRadius:5,background:"var(--color-background-secondary)",marginBottom:4,borderLeft:`2px solid ${ec}`}}>
                          <div style={{fontWeight:500}}>{isSrc?"→":"←"} {other}</div>
                          <div style={{fontSize:10,color:ec}}>{r.type}</div>
                          {r.fact&&<div style={{fontSize:10,color:"var(--color-text-secondary)",marginTop:2,lineHeight:1.4}}>{r.fact}</div>}
                          {r.source_url&&<a href={r.source_url} target="_blank" rel="noopener noreferrer" style={{fontSize:10,color:"var(--color-text-tertiary)",display:"block",marginTop:2,textDecoration:"underline",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.source_title||r.source_url}</a>}
                          {r.hidden_score>50&&<div style={{fontSize:10,color:"#E24B4A"}}>⚠ opacità: {r.hidden_score}</div>}
                        </div>
                      )
                    })}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {!loading&&tab==="predictions"&&(
        <div style={{padding:20,maxWidth:820}}>
          <h2 style={{fontSize:15,fontWeight:500,marginBottom:4}}>Previsioni predittive</h2>
          <p style={{fontSize:12,color:"var(--color-text-tertiary)",marginBottom:16}}>Generate da Claude AI analizzando le reti di influenza del grafo. Clicca ↻ Aggiorna per rigenerare.</p>
          {alerts.filter(a=>a.confidence>0).length===0&&<p style={{color:"var(--color-text-tertiary)",fontSize:13}}>Nessuna previsione disponibile. Clicca ↻ Aggiorna per generare.</p>}
          {alerts.filter(a=>a.confidence>0).map((a,i)=>(
            <div key={i} style={{background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderLeft:`3px solid ${SEV_COLOR[a.severity]||"#888"}`,borderRadius:8,padding:"14px 16px",marginBottom:12}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,flexWrap:"wrap"}}>
                <span style={{fontSize:11,fontWeight:500,padding:"2px 7px",borderRadius:4,background:SEV_COLOR[a.severity]+"22",color:SEV_COLOR[a.severity]}}>{a.severity}</span>
                <span style={{fontSize:14,fontWeight:500,flex:1}}>{a.title}</span>
                <span style={{fontSize:12,color:"var(--color-text-tertiary)"}}>confidence: <strong style={{color:"var(--color-text-primary)"}}>{a.confidence}%</strong></span>
              </div>
              <p style={{fontSize:13,color:"var(--color-text-secondary)",marginBottom:8,lineHeight:1.5}}>{a.description}</p>
              {a.hidden_network&&(
                <div style={{fontSize:12,padding:"8px 10px",background:"#E24B4A11",borderRadius:6,marginBottom:8,borderLeft:"2px solid #E24B4A"}}>
                  <span style={{fontSize:10,fontWeight:500,color:"#E24B4A",display:"block",marginBottom:2}}>RETE NASCOSTA IDENTIFICATA</span>
                  {a.hidden_network}
                </div>
              )}
              <div style={{display:"flex",gap:12,fontSize:11,color:"var(--color-text-tertiary)"}}>
                {a.timeframe&&<span>⏱ {a.timeframe}</span>}
                {a.recommendation&&<span>📋 {a.recommendation}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading&&tab==="hidden"&&(
        <div style={{padding:20,maxWidth:820}}>
          <h2 style={{fontSize:15,fontWeight:500,marginBottom:4}}>Reti di influenza nascoste</h2>
          <p style={{fontSize:12,color:"var(--color-text-tertiary)",marginBottom:16}}>Cluster di influenza non trasparente identificati da Claude AI sul grafo delle relazioni.</p>
          {hiddenNets.length===0&&<p style={{color:"var(--color-text-tertiary)",fontSize:13}}>Nessuna rete nascosta rilevata ancora. Clicca ↻ Aggiorna per analizzare.</p>}
          {hiddenNets.map((hn,i)=>(
            <div key={i} style={{background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:8,padding:"14px 16px",marginBottom:12}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                <div style={{width:10,height:10,borderRadius:"50%",background:hiddenColor(hn.opacity_score)}}/>
                <span style={{fontWeight:500,fontSize:14}}>{hn.name}</span>
                <span style={{fontSize:11,padding:"2px 7px",borderRadius:4,background:hiddenColor(hn.opacity_score)+"22",color:hiddenColor(hn.opacity_score),marginLeft:"auto"}}>opacità {hn.opacity_score}</span>
                <span style={{fontSize:11,color:"var(--color-text-tertiary)"}}>reach {hn.reach_score}</span>
              </div>
              <p style={{fontSize:13,color:"var(--color-text-secondary)",marginBottom:8,lineHeight:1.5}}>{hn.description}</p>
              {hn.mechanism&&<div style={{fontSize:12,padding:"6px 10px",background:"var(--color-background-secondary)",borderRadius:5,marginBottom:8}}>⚙️ <strong>Meccanismo:</strong> {hn.mechanism}</div>}
              {hn.policy_areas&&(
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {(typeof hn.policy_areas==="string"?JSON.parse(hn.policy_areas):hn.policy_areas).map((area,j)=>(
                    <span key={j} style={{fontSize:11,padding:"2px 8px",borderRadius:4,background:"var(--color-background-secondary)",color:"var(--color-text-secondary)"}}>{area}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading&&tab==="alerts"&&(
        <div style={{padding:20,maxWidth:820}}>
          <h2 style={{fontSize:15,fontWeight:500,marginBottom:16}}>Alert politici ({alerts.length})</h2>
          {alerts.map((a,i)=>(
            <div key={i} style={{background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderLeft:`3px solid ${SEV_COLOR[a.severity]||"#888"}`,borderRadius:8,padding:"12px 16px",marginBottom:10}}>
              <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:6}}>
                <span style={{fontSize:11,fontWeight:500,padding:"2px 7px",borderRadius:4,background:SEV_COLOR[a.severity]+"22",color:SEV_COLOR[a.severity]}}>{a.severity}</span>
                <span style={{fontSize:13,fontWeight:500}}>{a.title}</span>
                {a.confidence>0&&<span style={{marginLeft:"auto",fontSize:11,color:"var(--color-text-tertiary)"}}>conf. {a.confidence}%</span>}
              </div>
              <p style={{fontSize:12,color:"var(--color-text-secondary)",lineHeight:1.5,marginBottom:6}}>{a.description}</p>
              {a.timeframe&&<span style={{fontSize:11,color:"var(--color-text-tertiary)"}}>⏱ {a.timeframe}</span>}
            </div>
          ))}
        </div>
      )}

      {!loading&&tab==="ranking"&&(
        <div style={{padding:20,maxWidth:720}}>
          <h2 style={{fontSize:15,fontWeight:500,marginBottom:4}}>Ranking influenza</h2>
          <p style={{fontSize:12,color:"var(--color-text-tertiary)",marginBottom:16}}>Punteggio combinato: influenza dichiarata + opacità delle connessioni.</p>
          {nodes.sort((a,b)=>(b.influence_score+b.hidden_score)-(a.influence_score+a.hidden_score)).slice(0,18).map((n,i)=>(
            <div key={n.id} onClick={()=>{setTab("graph");selectNode(n)}} style={{background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:8,padding:"10px 14px",marginBottom:8,display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
              <span style={{fontSize:12,color:"var(--color-text-tertiary)",minWidth:22}}>#{i+1}</span>
              <div style={{width:8,height:8,borderRadius:"50%",background:NODE_COLORS[n.type]||"#888"}}/>
              <div style={{flex:1}}>
                <div style={{fontWeight:500,fontSize:13}}>{n.label}</div>
                <div style={{fontSize:11,color:"var(--color-text-tertiary)"}}>{n.type} · {n.country||"—"}</div>
              </div>
              <div style={{textAlign:"right",minWidth:80}}>
                <div style={{display:"flex",gap:6,justifyContent:"flex-end"}}>
                  <span style={{fontSize:11,padding:"1px 6px",borderRadius:3,background:"#E8772E22",color:"#A8501A"}}>inf {n.influence_score}</span>
                  <span style={{fontSize:11,padding:"1px 6px",borderRadius:3,background:hiddenColor(n.hidden_score)+"22",color:hiddenColor(n.hidden_score)}}>hid {n.hidden_score}</span>
                </div>
              </div>
              <div style={{width:70,height:5,background:"var(--color-background-secondary)",borderRadius:3,overflow:"hidden"}}>
                <div style={{width:`${(n.influence_score+n.hidden_score)/2}%`,height:"100%",background:NODE_COLORS[n.type]||"#888",borderRadius:3}}/>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
