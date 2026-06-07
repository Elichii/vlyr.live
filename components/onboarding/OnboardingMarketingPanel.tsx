"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Star, Shield, TrendingUp, BarChart3, Zap, CheckCircle2, ThumbsUp, QrCode, Bell } from "lucide-react"

interface Props { isVerified?: boolean; businessRating?: number; totalReviews?: number; businessName?: string }
const Y = "#FFE100"; const DK = "#0A0A0A"

function VLogo({ h = 22 }: { h?: number }) {
  return <img src="/images/vlyr-logo-white.png" alt="VLYR" style={{ height: h, width: "auto", objectFit: "contain" }} />
}

function Stars({ n, size = 16, animated = false }: { n: number; size?: number; animated?: boolean }) {
  const [shown, setShown] = useState(animated ? 0 : n)
  useEffect(() => {
    if (!animated) return
    setShown(0); let i = 0
    const id = setInterval(() => { i++; setShown(i); if (i >= n) clearInterval(id) }, 200)
    return () => clearInterval(id)
  }, [n, animated])
  return (
    <div style={{ display:"flex", gap:4 }}>
      {[1,2,3,4,5].map(i => (
        <motion.span key={i} animate={animated&&i===shown?{scale:[1,1.6,1]}:{}} transition={{duration:0.25}}>
          <Star size={size} style={{ fill: i<=shown?Y:"#2A2A2A", color: i<=shown?Y:"#2A2A2A" }} />
        </motion.span>
      ))}
    </div>
  )
}

function QRSvg({ size = 80 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 21 21">
      <rect width="21" height="21" fill="white"/>
      <rect x="1" y="1" width="7" height="7" fill={DK} rx="0.5"/><rect x="2" y="2" width="5" height="5" fill="white"/><rect x="3" y="3" width="3" height="3" fill={DK}/>
      <rect x="13" y="1" width="7" height="7" fill={DK} rx="0.5"/><rect x="14" y="2" width="5" height="5" fill="white"/><rect x="15" y="3" width="3" height="3" fill={DK}/>
      <rect x="1" y="13" width="7" height="7" fill={DK} rx="0.5"/><rect x="2" y="14" width="5" height="5" fill="white"/><rect x="3" y="15" width="3" height="3" fill={DK}/>
      {[[9,1],[11,1],[9,3],[11,3],[10,5],[9,7],[11,7],[1,9],[3,9],[5,9],[7,9],[9,9],[11,9],[13,9],[15,9],[17,9],[19,9],[9,11],[11,11],[13,11],[9,13],[11,13],[15,13],[17,13],[9,15],[13,15],[15,15],[17,15],[9,17],[11,17],[13,17],[17,17],[19,17],[9,19],[11,19],[15,19],[17,19],[19,19]].map(([x,y],i)=><rect key={i} x={x} y={y} width="1" height="1" fill={DK}/>)}
    </svg>
  )
}

// Real iPhone mockup
function IPhone({ children, w = 270 }: { children: React.ReactNode; w?: number }) {
  const h = Math.round(w * 2.05)
  const r = Math.round(w * 0.155)
  return (
    <div style={{ position:"relative", width:w, height:h, flexShrink:0,
      borderRadius:r, background:"#1A1A1A",
      boxShadow:`0 0 0 3px #2A2A2A, 0 0 0 5px #111, 0 40px 100px rgba(0,0,0,0.8)` }}>
      <div style={{position:"absolute", left:-5, top:"22%", width:4, height:34, background:"#2A2A2A", borderRadius:"3px 0 0 3px"}}/>
      <div style={{position:"absolute", left:-5, top:"31%", width:4, height:60, background:"#2A2A2A", borderRadius:"3px 0 0 3px"}}/>
      <div style={{position:"absolute", left:-5, top:"43%", width:4, height:60, background:"#2A2A2A", borderRadius:"3px 0 0 3px"}}/>
      <div style={{position:"absolute", right:-5, top:"30%", width:4, height:80, background:"#2A2A2A", borderRadius:"0 3px 3px 0"}}/>
      <div style={{position:"absolute", inset:4, borderRadius:r-4, overflow:"hidden", background:"#000"}}>
        {/* Dynamic island */}
        <div style={{position:"absolute", top:12, left:"50%", transform:"translateX(-50%)",
          width:110, height:32, borderRadius:20, background:"#000", zIndex:30,
          boxShadow:"0 0 0 2px #111"}}/>
        {children}
      </div>
      <div style={{position:"absolute", bottom:7, left:"50%", transform:"translateX(-50%)", width:110, height:5, borderRadius:3, background:"#2A2A2A"}}/>
    </div>
  )
}

// Phone screens
function ScanScreen() {
  return (
    <div style={{width:"100%",height:"100%",background:"#000",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:20}}>
      <div style={{position:"absolute",top:52,left:0,right:0,display:"flex",justifyContent:"space-between",padding:"0 24px",color:"white",fontSize:13,fontWeight:600}}>
        <span>9:41</span><span style={{fontSize:11,display:"flex",gap:5}}>▲▲▲ WiFi 🔋</span>
      </div>
      <p style={{color:"rgba(255,255,255,0.3)",fontSize:12,letterSpacing:3,textTransform:"uppercase"}}>Camera</p>
      <div style={{position:"relative",width:140,height:140}}>
        {[{t:0,l:0,cls:"tl"},{t:0,r:0,cls:"tr"},{b:0,l:0,cls:"bl"},{b:0,r:0,cls:"br"}].map(({cls,...p},i)=>(
          <div key={i} style={{position:"absolute",width:30,height:30,...p as any,
            borderTop:cls.startsWith("t")?`3px solid ${Y}`:undefined,
            borderBottom:cls.startsWith("b")?`3px solid ${Y}`:undefined,
            borderLeft:cls.endsWith("l")?`3px solid ${Y}`:undefined,
            borderRight:cls.endsWith("r")?`3px solid ${Y}`:undefined,
            borderTopLeftRadius:cls==="tl"?6:0,borderTopRightRadius:cls==="tr"?6:0,
            borderBottomLeftRadius:cls==="bl"?6:0,borderBottomRightRadius:cls==="br"?6:0}}/>
        ))}
        <motion.div style={{position:"absolute",left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${Y},transparent)`,opacity:0.9}}
          animate={{top:["8%","90%","8%"]}} transition={{duration:1.8,repeat:Infinity,ease:"easeInOut"}}/>
      </div>
      <p style={{color:"rgba(255,255,255,0.2)",fontSize:13}}>Align QR code in frame</p>
    </div>
  )
}

function RatingScreen({ stars, name }: { stars: number; name: string }) {
  return (
    <div style={{width:"100%",height:"100%",background:"#fff",display:"flex",flexDirection:"column",alignItems:"center"}}>
      <div style={{width:"100%",display:"flex",justifyContent:"space-between",padding:"52px 24px 0",fontSize:13,fontWeight:600,color:DK}}>
        <span>9:41</span><span style={{fontSize:11}}>🔋 WiFi ▲▲▲</span>
      </div>
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:18,padding:"0 28px 48px"}}>
        <div style={{width:70,height:70,borderRadius:20,background:Y,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 8px 30px ${Y}50`}}>
          <img src="/images/vlyr-logo.png" alt="VLYR" style={{height:38,width:"auto"}}/>
        </div>
        <div style={{textAlign:"center"}}>
          <p style={{fontWeight:800,fontSize:18,color:DK}}>Rate your experience</p>
          <p style={{fontSize:14,color:"#888",marginTop:4}}>{name}</p>
        </div>
        <Stars n={stars} size={30} animated/>
        <p style={{fontSize:13,color:"#AAA",textAlign:"center"}}>{stars>=4?"Tap to share on Google →":"Share privately with manager →"}</p>
      </div>
    </div>
  )
}

function SuccessScreen({ type }: { type:"google"|"private" }) {
  return (
    <div style={{width:"100%",height:"100%",background:type==="google"?"#fff":DK,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:22}}>
      <motion.div initial={{scale:0}} animate={{scale:1}} transition={{type:"spring",stiffness:260,delay:0.15}}
        style={{width:100,height:100,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",
          background:type==="google"?"#f0fdf4":`${Y}15`,border:`2px solid ${type==="google"?"#bbf7d0":`${Y}40`}`,
          boxShadow:type==="google"?"0 0 40px rgba(0,200,80,0.2)":`0 0 40px ${Y}20`}}>
        {type==="google"
          ?<svg width="46" height="46" viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          :<Shield size={46} style={{color:Y}}/>}
      </motion.div>
      <div style={{textAlign:"center"}}>
        <p style={{fontWeight:800,fontSize:18,color:type==="google"?"#166534":Y}}>{type==="google"?"⭐ Posted to Google!":"Captured Privately"}</p>
        <p style={{fontSize:14,color:type==="google"?"#16a34a":"#666",marginTop:6}}>{type==="google"?"Your rating just improved":"Not posted to Google"}</p>
      </div>
    </div>
  )
}

function AlertScreen({ stars, review }: { stars: number; review: string }) {
  return (
    <div style={{width:"100%",height:"100%",background:DK,display:"flex",flexDirection:"column"}}>
      <div style={{padding:"52px 18px 12px",borderBottom:"1px solid #1F1F1F",display:"flex",alignItems:"center",gap:10}}>
        <img src="/images/vlyr-logo-white.png" alt="VLYR" style={{height:16,width:"auto"}}/>
        <span style={{color:"white",fontWeight:700,fontSize:14}}>VLYR Alert</span>
        <span style={{marginLeft:"auto",background:"#FF444422",color:"#FF4444",fontSize:11,padding:"3px 9px",borderRadius:20,fontWeight:700}}>New</span>
      </div>
      <div style={{flex:1,padding:18,display:"flex",flexDirection:"column",gap:12}}>
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:0.3}}
          style={{background:"#1A1A1A",border:"1px solid #2A2A2A",borderRadius:16,padding:16}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}><Shield size={13} style={{color:Y}}/><span style={{color:Y,fontWeight:700,fontSize:12}}>Captured Privately</span></div>
          <Stars n={stars} size={15}/>
          <p style={{color:"#888",fontSize:13,marginTop:10,lineHeight:1.5}}>"{review}"</p>
        </motion.div>
        <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.8}}
          style={{background:"#0f1a0a",border:"1px solid #00c75830",borderRadius:12,padding:"10px 14px",display:"flex",alignItems:"center",gap:8}}>
          <CheckCircle2 size={13} style={{color:"#00c758"}}/><span style={{color:"#00c758",fontSize:13}}>Not posted to Google</span>
        </motion.div>
      </div>
    </div>
  )
}

function ReplyScreen() {
  const [t, setT] = useState("")
  const msg = "Hi Jason! So sorry about the wait. I've arranged a complimentary meal for your next visit 🍕"
  useEffect(()=>{ let i=0; const id=setInterval(()=>{ i++; setT(msg.slice(0,i)); if(i>=msg.length)clearInterval(id) },20); return()=>clearInterval(id) },[])
  return (
    <div style={{width:"100%",height:"100%",background:DK,display:"flex",flexDirection:"column"}}>
      <div style={{padding:"52px 18px 12px",borderBottom:"1px solid #1F1F1F",display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:34,height:34,borderRadius:"50%",background:"#333",display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:700,fontSize:14}}>M</div>
        <span style={{color:"white",fontWeight:700,fontSize:14}}>Manager Reply</span>
      </div>
      <div style={{flex:1,padding:18,display:"flex",flexDirection:"column",justifyContent:"flex-end",gap:10}}>
        <div style={{alignSelf:"flex-end",maxWidth:"85%",background:"#333",borderRadius:"18px 18px 4px 18px",padding:"12px 16px",fontSize:13,lineHeight:1.5,color:"white"}}>
          {t}<motion.span animate={{opacity:[1,0,1]}} transition={{duration:0.8,repeat:Infinity}}>|</motion.span>
        </div>
        {t.length>50&&<motion.div initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} style={{display:"flex",alignItems:"center",gap:6,fontSize:13,color:"#00c758"}}>
          <CheckCircle2 size={13}/> Issue resolved ✓
        </motion.div>}
      </div>
    </div>
  )
}

// ── Full-bleed scene wrapper ──────────────────────────────────────────────────
function Scene({ label, caption, children, progress }: { label:string; caption:string; children:React.ReactNode; progress?: React.ReactNode }) {
  return (
    <div style={{position:"absolute",inset:0,background:DK}}>
      {/* Header overlay */}
      <div style={{position:"absolute",top:0,left:0,right:0,padding:"28px 36px 0",display:"flex",alignItems:"center",justifyContent:"space-between",zIndex:20}}>
        <VLogo/><span style={{color:"#444",fontSize:11,fontWeight:700,letterSpacing:"0.15em",textTransform:"uppercase"}}>{label}</span>
      </div>
      {/* Progress bars if provided */}
      {progress && <div style={{position:"absolute",top:68,left:36,right:36,zIndex:20}}>{progress}</div>}
      {/* Main content */}
      <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",padding:"90px 36px 70px"}}>
        {children}
      </div>
      {/* Caption */}
      <div style={{position:"absolute",bottom:24,left:0,right:0,textAlign:"center"}}>
        <AnimatePresence mode="wait">
          <motion.p key={caption} initial={{opacity:0,y:5}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-5}} transition={{duration:0.3}} style={{color:"#555",fontSize:15}}>{caption}</motion.p>
        </AnimatePresence>
      </div>
    </div>
  )
}

// ── Story scenes ──────────────────────────────────────────────────────────────
function S1Pizza({ paused }: { paused:boolean }) {
  const [s, setS] = useState(0)
  useEffect(()=>{ if(paused)return; const ts=[setTimeout(()=>setS(1),800),setTimeout(()=>setS(2),2600),setTimeout(()=>setS(3),4300)]; return()=>ts.forEach(clearTimeout) },[paused])
  return (
    <Scene label="Pizza delivery" caption={["QR sticker on the box","Customer rates the delivery","5★ review posted to Google"][Math.min(s,2)]}>
      <div style={{display:"flex",alignItems:"flex-end",justifyContent:"center",gap:40,width:"100%"}}>
        <motion.div initial={{y:40,opacity:0}} animate={{y:0,opacity:1}} transition={{duration:0.7,type:"spring"}}>
          <div style={{position:"relative",width:260,height:220,borderRadius:22,overflow:"hidden",background:"linear-gradient(145deg,#9B5523,#C4621D)",boxShadow:"0 25px 70px rgba(0,0,0,0.6)"}}>
            <div style={{position:"absolute",inset:0,opacity:0.08,backgroundImage:"repeating-linear-gradient(45deg,#000 0,#000 1px,transparent 1px,transparent 10px)"}}/>
            <div style={{position:"absolute",top:18,left:20}}><div style={{color:"white",fontSize:17,fontWeight:900,letterSpacing:2}}>🍕 PRESTO</div><div style={{color:"rgba(255,255,255,0.5)",fontSize:12,marginTop:3}}>Artisan Pizza Co.</div></div>
            <div style={{position:"absolute",bottom:14,right:14,background:"white",borderRadius:14,padding:"10px 10px 8px"}}>
              <div style={{fontSize:7,fontWeight:900,letterSpacing:3,color:DK,textAlign:"center",marginBottom:6}}>VLYR</div>
              <QRSvg size={72}/>
            </div>
            {s===1&&<motion.div style={{position:"absolute",bottom:8,right:8,width:100,height:100,borderRadius:18,border:`3px solid ${Y}`}} animate={{opacity:[0.3,1,0.3],scale:[0.95,1.05,0.95]}} transition={{duration:0.9,repeat:Infinity}}/>}
          </div>
        </motion.div>
        <AnimatePresence>
          {s>=1&&<motion.div initial={{y:-60,rotate:-20,opacity:0}} animate={{y:0,rotate:-8,opacity:1}} exit={{opacity:0}} transition={{duration:0.9,type:"spring",stiffness:100}}>
            <IPhone w={255}>{s===1?<ScanScreen/>:s===2?<RatingScreen stars={5} name="Presto Artisan Pizza"/>:<SuccessScreen type="google"/>}</IPhone>
          </motion.div>}
        </AnimatePresence>
      </div>
    </Scene>
  )
}

function S2Table({ paused }: { paused:boolean }) {
  const [s, setS] = useState(0)
  useEffect(()=>{ if(paused)return; const ts=[setTimeout(()=>setS(1),700),setTimeout(()=>setS(2),2400),setTimeout(()=>setS(3),4000)]; return()=>ts.forEach(clearTimeout) },[paused])
  return (
    <Scene label="Restaurant table" caption={["QR stand on every table","Customer scans after lunch","2★ feedback captured privately"][Math.min(s,2)]}>
      <div style={{display:"flex",alignItems:"flex-end",justifyContent:"center",gap:40,width:"100%"}}>
        <motion.div initial={{y:30,opacity:0}} animate={{y:0,opacity:1}} transition={{duration:0.6}}>
          <div style={{position:"relative",width:255,height:220,borderRadius:22,overflow:"hidden",background:"linear-gradient(150deg,#2C1810,#4A2214)",boxShadow:"0 25px 70px rgba(0,0,0,0.6)"}}>
            <div style={{position:"absolute",inset:0,opacity:0.15,backgroundImage:"repeating-linear-gradient(20deg,#000 0,#000 1px,transparent 1px,transparent 14px)"}}/>
            <div style={{position:"absolute",top:18,right:22,width:74,height:74,borderRadius:"50%",border:"2px solid #D4A060",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <div style={{width:52,height:52,borderRadius:"50%",background:"#4A2810"}}/>
            </div>
            <div style={{position:"absolute",left:22,top:18,display:"flex",gap:5}}>
              <div style={{width:3,height:74,background:"#C0A060",borderRadius:2}}/><div style={{width:6,height:74,background:"#C0A060",borderRadius:2}}/>
            </div>
            <div style={{position:"absolute",bottom:10,left:"50%",transform:"translateX(-50%)",display:"flex",flexDirection:"column",alignItems:"center"}}>
              <div style={{background:"rgba(255,255,255,0.97)",borderRadius:14,padding:"9px 9px 7px",boxShadow:"0 4px 20px rgba(0,0,0,0.4)"}}>
                <div style={{fontSize:6,fontWeight:900,letterSpacing:3,color:DK,textAlign:"center",marginBottom:5}}>VLYR</div>
                <QRSvg size={58}/>
              </div>
              <div style={{width:2,height:18,background:"#888"}}/><div style={{width:40,height:3,background:"#888",borderRadius:2}}/>
            </div>
            {s===1&&<motion.div style={{position:"absolute",bottom:24,left:"50%",transform:"translateX(-50%)",width:80,height:78,borderRadius:12,border:`3px solid ${Y}`}} animate={{opacity:[0.3,1,0.3]}} transition={{duration:0.9,repeat:Infinity}}/>}
          </div>
        </motion.div>
        <AnimatePresence>
          {s>=1&&<motion.div initial={{y:-50,rotate:14,opacity:0}} animate={{y:0,rotate:7,opacity:1}} exit={{opacity:0}} transition={{duration:0.9,type:"spring",stiffness:100}}>
            <IPhone w={255}>{s===1?<ScanScreen/>:s===2?<RatingScreen stars={2} name="The Oak Restaurant"/>:<SuccessScreen type="private"/>}</IPhone>
          </motion.div>}
        </AnimatePresence>
      </div>
    </Scene>
  )
}

function S3BadReview({ paused }: { paused:boolean }) {
  const [s, setS] = useState(0)
  useEffect(()=>{ if(paused)return; const ts=[setTimeout(()=>setS(1),500),setTimeout(()=>setS(2),2600)]; return()=>ts.forEach(clearTimeout) },[paused])
  return (
    <Scene label="Bad review intercepted" caption={s<2?"VLYR captures the complaint privately":"Blocked — never reaches Google"}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:50,width:"100%"}}>
        <motion.div initial={{x:-30,opacity:0}} animate={{x:0,opacity:1}} transition={{duration:0.6}}>
          <IPhone w={240}>{s===0?<div style={{width:"100%",height:"100%",background:DK,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:"#333"}}>Home</div>:<AlertScreen stars={1} review="Waited 40 mins, food was cold."/>}</IPhone>
        </motion.div>
        <AnimatePresence>
          {s>=1&&<motion.div initial={{scale:0,opacity:0}} animate={{scale:1,opacity:1}} transition={{type:"spring",stiffness:160,delay:0.3}}
            style={{display:"flex",flexDirection:"column",alignItems:"center",gap:20}}>
            <div style={{position:"relative",width:170,height:170,display:"flex",alignItems:"center",justifyContent:"center"}}>
              {[260,210,160].map((d,i)=>(
                <motion.div key={i} style={{position:"absolute",width:d,height:d,borderRadius:"50%",border:`1.5px solid ${Y}`,opacity:0.12}}
                  animate={{scale:[1,1.1,1],opacity:[0.12,0.03,0.12]}} transition={{duration:2.5,repeat:Infinity,delay:i*0.5}}/>
              ))}
              <div style={{width:110,height:110,borderRadius:30,background:`${Y}18`,border:`3px solid ${Y}55`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 0 60px ${Y}20`}}>
                <Shield size={50} style={{color:Y}}/>
              </div>
            </div>
            <div style={{textAlign:"center"}}>
              <p style={{color:Y,fontWeight:900,fontSize:18,letterSpacing:"0.1em"}}>BLOCKED</p>
              <p style={{color:"#555",fontSize:14,marginTop:4}}>Not on Google</p>
            </div>
            {s>=2&&<motion.div initial={{y:10,opacity:0}} animate={{y:0,opacity:1}} transition={{delay:0.2}}
              style={{background:"#111",border:"1px solid #2A2A2A",borderRadius:18,padding:18,width:200}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                <img src="/images/vlyr-logo-white.png" alt="VLYR" style={{height:14,width:"auto"}}/>
                <span style={{color:"white",fontWeight:700,fontSize:14}}>Manager Alert</span>
              </div>
              <p style={{color:Y,fontSize:13}}>1★ from Jason M.</p>
              <p style={{color:"#666",fontSize:12,marginTop:4,lineHeight:1.5}}>"Food was cold..."</p>
              <div style={{display:"flex",alignItems:"center",gap:6,marginTop:8,color:"#00c758",fontSize:12}}><Shield size={11}/> Captured privately</div>
            </motion.div>}
          </motion.div>}
        </AnimatePresence>
      </div>
    </Scene>
  )
}

function S4ManagerFix({ paused }: { paused:boolean }) {
  const [s, setS] = useState(0)
  useEffect(()=>{ if(paused)return; const ts=[setTimeout(()=>setS(1),600),setTimeout(()=>setS(2),2800),setTimeout(()=>setS(3),4100)]; return()=>ts.forEach(clearTimeout) },[paused])
  return (
    <Scene label="Manager responds" caption={["Manager reads the complaint","Typing a personal apology","Customer is now happy ✓"][Math.min(s,2)]}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:24,width:"100%"}}>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10}}>
          <p style={{color:"#555",fontSize:12,fontWeight:600}}>Manager</p>
          <motion.div initial={{y:20,opacity:0}} animate={{y:0,opacity:1}}>
            <IPhone w={210}>{s===0?<AlertScreen stars={1} review="Waited 40 mins, food cold."/>:<ReplyScreen/>}</IPhone>
          </motion.div>
        </div>
        <AnimatePresence>
          {s>=2&&<motion.div initial={{scale:0,opacity:0}} animate={{scale:1,opacity:1}} transition={{type:"spring"}}
            style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
            <motion.div animate={{x:[0,10,0]}} transition={{duration:0.9,repeat:Infinity}} style={{fontSize:36,color:Y}}>→</motion.div>
            <span style={{color:"#555",fontSize:12}}>sent</span>
          </motion.div>}
        </AnimatePresence>
        <AnimatePresence>
          {s>=2&&<motion.div initial={{x:40,opacity:0}} animate={{x:0,opacity:1}} transition={{type:"spring",delay:0.2}}
            style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10}}>
            <p style={{color:"#555",fontSize:12,fontWeight:600}}>Customer</p>
            <IPhone w={210}>
              <div style={{width:"100%",height:"100%",background:"#fff",display:"flex",flexDirection:"column"}}>
                <div style={{padding:"52px 18px 12px",borderBottom:"1px solid #E5E5E5",fontSize:14,fontWeight:700,color:DK}}>Message from Manager</div>
                <div style={{flex:1,padding:18,display:"flex",flexDirection:"column",justifyContent:"flex-end",gap:10}}>
                  <div style={{alignSelf:"flex-start",maxWidth:"85%",background:"#F0F0F0",borderRadius:"4px 18px 18px 18px",padding:"12px 16px",fontSize:13,lineHeight:1.5,color:DK}}>
                    Hi Jason! Sorry about the wait. We've arranged a free meal 🍕
                  </div>
                  {s>=3&&<motion.div initial={{scale:0}} animate={{scale:1}} transition={{type:"spring"}} style={{display:"flex",alignItems:"center",gap:6,fontSize:13,color:"#00c758",alignSelf:"flex-end"}}>
                    <ThumbsUp size={14}/> Happy customer!
                  </motion.div>}
                </div>
              </div>
            </IPhone>
          </motion.div>}
        </AnimatePresence>
      </div>
    </Scene>
  )
}

function S5RatingUp({ paused }: { paused:boolean }) {
  const [s, setS] = useState(0)
  const [r, setR] = useState(4.1)
  useEffect(()=>{ if(paused)return; const ts=[setTimeout(()=>setS(1),400),setTimeout(()=>{ [4.2,4.4,4.5,4.6,4.7].forEach((v,i)=>setTimeout(()=>setR(v),i*350)) },700),setTimeout(()=>setS(2),3000),setTimeout(()=>setS(3),3900)]; return()=>ts.forEach(clearTimeout) },[paused])
  return (
    <Scene label="Rating improves" caption={["Jason is now satisfied","Your Google rating is climbing","🛡 Reputation protected"][Math.min(s,2)]}>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:28,width:"100%"}}>
        <motion.div initial={{scale:0.85,opacity:0}} animate={{scale:1,opacity:1}} transition={{type:"spring"}} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:18}}>
          <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 24px",borderRadius:999,background:"#111",border:"1px solid #2A2A2A"}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            <span style={{color:"white",fontWeight:600,fontSize:14}}>Google Rating</span>
          </div>
          <div style={{display:"flex",alignItems:"baseline",gap:12}}>
            <motion.span key={r} initial={{scale:1.35,color:Y}} animate={{scale:1,color:"#FFFFFF"}} transition={{duration:0.35}}
              style={{fontSize:110,fontWeight:900,lineHeight:1,letterSpacing:"-0.03em",fontFamily:"Figtree,sans-serif"}}>{r.toFixed(1)}</motion.span>
            <span style={{fontSize:30,color:"#2A2A2A",fontWeight:700}}>/ 5</span>
          </div>
          <Stars n={Math.round(r)} size={28}/>
          {s>=1&&<motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 22px",borderRadius:999,background:"#00c75814",border:"1px solid #00c75836"}}>
            <TrendingUp size={15} style={{color:"#00c758"}}/><span style={{color:"#00c758",fontWeight:700,fontSize:14}}>+0.6 this month · 47 new reviews</span>
          </motion.div>}
        </motion.div>
        {s>=2&&<motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{type:"spring"}} style={{display:"flex",alignItems:"center",gap:36}}>
          {[{e:"😊",n:"Jason M.",l:"Happy",c:"#00c758"},{e:"🛡",n:"VLYR",l:"Protected",c:Y},{e:"💼",n:"Manager",l:"Resolved",c:"#00c758"}].map((p,i)=>(
            <div key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
              <div style={{width:60,height:60,borderRadius:"50%",background:"#1A1A1A",border:`2px solid ${p.n==="VLYR"?`${Y}40`:"#2A2A2A"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26}}>{p.e}</div>
              <span style={{color:"#666",fontSize:12}}>{p.n}</span>
              <span style={{color:p.c,fontSize:12,fontWeight:700}}>{p.l}</span>
            </div>
          ))}
        </motion.div>}
        {s>=3&&<motion.div initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} transition={{type:"spring"}} style={{padding:"14px 40px",borderRadius:999,background:Y,color:DK,fontWeight:900,fontSize:16}}>🛡 Reputation Protected</motion.div>}
      </div>
    </Scene>
  )
}

// ── Story Panel ───────────────────────────────────────────────────────────────
const STORY = [S1Pizza,S2Table,S3BadReview,S4ManagerFix,S5RatingUp]
const STORY_LBL = ["Pizza delivery","Restaurant table","Bad review","Manager responds","Rating up!"]

function StoryPanel({ paused }: { paused:boolean }) {
  const [idx,setIdx]=useState(0); const [ms,setMs]=useState(0); const D=6000
  useEffect(()=>{ if(paused)return; setMs(0); const t=setInterval(()=>setMs(p=>{ if(p>=D){setIdx(i=>(i+1)%STORY.length);return 0} return p+50 }),50); return()=>clearInterval(t) },[paused,idx])
  const Sc=STORY[idx]
  return (
    <div style={{position:"absolute",inset:0,background:DK}}>
      {/* Progress bars */}
      <div style={{position:"absolute",top:68,left:36,right:36,zIndex:20,display:"flex",gap:6}}>
        {STORY.map((_,i)=>(
          <button key={i} onClick={()=>setIdx(i)} style={{flex:1,height:3,borderRadius:2,background:"#1A1A1A",overflow:"hidden",border:"none",padding:0,cursor:"pointer"}}>
            <motion.div style={{height:"100%",borderRadius:2,background:i<idx?"#2A2A2A":i===idx?Y:"transparent"}} animate={{width:i<idx?"100%":i===idx?`${(ms/D)*100}%`:"0%"}} transition={{duration:0.05}}/>
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={idx} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.4}} style={{position:"absolute",inset:0}}>
          <Sc paused={paused}/>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ── V2: Feature Spotlight ─────────────────────────────────────────────────────
const FEATS=[
  {Icon:Shield,  color:Y,        title:"Reputation Shield", sub:"Stop bad reviews before\nthey ever go public."},
  {Icon:QrCode,  color:"#4285F4",title:"Pulse Check QR",    sub:"Every table, bag and receipt\ncaptures customer sentiment."},
  {Icon:Bell,    color:"#FF6B6B",title:"Instant Alerts",    sub:"Know when a customer\nis unhappy — immediately."},
  {Icon:BarChart3,color:"#00c758",title:"Live Analytics",   sub:"Your reputation,\ntracked in real time."},
  {Icon:Star,    color:Y,        title:"Rating Amplifier",  sub:"Turn every happy customer\ninto a Google review."},
]

function FeatureSpotlight({ paused }: { paused:boolean }) {
  const [idx,setIdx]=useState(0)
  useEffect(()=>{ if(paused)return; const id=setInterval(()=>setIdx(i=>(i+1)%FEATS.length),4200); return()=>clearInterval(id) },[paused])
  const f=FEATS[idx]
  return (
    <div style={{position:"absolute",inset:0,background:DK,display:"flex",flexDirection:"column"}}>
      <div style={{position:"absolute",top:28,left:36,right:36,display:"flex",alignItems:"center",justifyContent:"space-between",zIndex:10}}>
        <VLogo/>
        <div style={{display:"flex",gap:8}}>{FEATS.map((_,i)=><div key={i} style={{width:i===idx?24:8,height:8,borderRadius:4,background:i===idx?Y:"#1A1A1A",transition:"all 0.3s"}}/>)}</div>
      </div>
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"80px 48px"}}>
        <AnimatePresence mode="wait">
          <motion.div key={idx} initial={{opacity:0,y:50,scale:0.9}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-30,scale:0.95}}
            transition={{duration:0.55,ease:[0.34,1.56,0.64,1]}} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:36,textAlign:"center"}}>
            <div style={{position:"relative"}}>
              <div style={{position:"absolute",inset:0,borderRadius:"50%",background:f.color,filter:"blur(60px)",opacity:0.18,transform:"scale(1.6)"}}/>
              <div style={{position:"relative",width:148,height:148,borderRadius:42,display:"flex",alignItems:"center",justifyContent:"center",background:`${f.color}18`,border:`2px solid ${f.color}40`,boxShadow:`0 0 80px ${f.color}18`}}>
                <f.Icon size={68} style={{color:f.color}}/>
              </div>
            </div>
            <div>
              <h2 style={{fontSize:56,fontWeight:900,color:"white",letterSpacing:"-0.02em",lineHeight:1.05,fontFamily:"Figtree,sans-serif"}}>{f.title}</h2>
              <p style={{fontSize:18,color:"#555",marginTop:14,lineHeight:1.65,whiteSpace:"pre-line"}}>{f.sub}</p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      <div style={{position:"absolute",bottom:28,left:0,right:0,display:"flex",justifyContent:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 22px",borderRadius:999,background:"#111",border:"1px solid #1F1F1F"}}>
          <div style={{width:8,height:8,borderRadius:"50%",background:"#00c758",animation:"pulse 1.5s infinite"}}/>
          <span style={{color:"white",fontSize:13,fontWeight:500}}>2,400+ businesses protected</span>
        </div>
      </div>
    </div>
  )
}

// ── V3: Stats Wall ────────────────────────────────────────────────────────────
const STATS=[
  {v:"73%",   l:"of issues resolved",   s:"before reaching Google",   c:Y},
  {v:"1,247", l:"businesses protected", s:"and counting today",        c:"#fff"},
  {v:"+0.8★", l:"average rating lift",  s:"within the first 30 days", c:"#00c758"},
  {v:"2×",    l:"more 5-star reviews",  s:"collected automatically",   c:Y},
  {v:"60s",   l:"avg response time",    s:"from scan to alert",        c:"#4285F4"},
]

function StatsWall({ paused }: { paused:boolean }) {
  const [idx,setIdx]=useState(0)
  useEffect(()=>{ if(paused)return; const id=setInterval(()=>setIdx(i=>(i+1)%STATS.length),3800); return()=>clearInterval(id) },[paused])
  const s=STATS[idx]
  return (
    <div style={{position:"absolute",inset:0,background:DK,display:"flex",flexDirection:"column"}}>
      <div style={{position:"absolute",inset:0,background:`radial-gradient(ellipse at 50% 55%, ${s.c}07 0%, transparent 65%)`,transition:"background 1.2s",pointerEvents:"none"}}/>
      <div style={{position:"absolute",top:28,left:36,right:36,display:"flex",alignItems:"center",justifyContent:"space-between",zIndex:10}}>
        <VLogo/><span style={{color:"#444",fontSize:11,fontWeight:700,letterSpacing:"0.15em",textTransform:"uppercase"}}>By the numbers</span>
      </div>
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"80px 48px"}}>
        <AnimatePresence mode="wait">
          <motion.div key={idx} initial={{opacity:0,scale:0.5}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:1.15}} transition={{duration:0.6,ease:[0.34,1.56,0.64,1]}}
            style={{display:"flex",flexDirection:"column",alignItems:"center",gap:24,textAlign:"center"}}>
            <div style={{fontSize:136,fontWeight:900,lineHeight:1,letterSpacing:"-0.04em",color:s.c,fontFamily:"Figtree,sans-serif"}}>{s.v}</div>
            <div>
              <p style={{fontSize:28,fontWeight:700,color:"white"}}>{s.l}</p>
              <p style={{fontSize:17,color:"#555",marginTop:8}}>{s.s}</p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      <div style={{position:"absolute",bottom:28,left:0,right:0,display:"flex",justifyContent:"center",gap:10}}>
        {STATS.map((_,i)=><div key={i} style={{width:i===idx?28:8,height:8,borderRadius:4,background:i===idx?Y:"#1A1A1A",transition:"all 0.35s"}}/>)}
      </div>
    </div>
  )
}

// ── V4: The VLYR Flow (FULL-WIDTH horizontal) ─────────────────────────────────
const FLOW=[
  {icon:"📱",label:"Customer scans",  sub:"QR on box, table or receipt"},
  {icon:"⭐",label:"Rates 1–5 stars", sub:"Anonymous · takes 3 seconds"},
  {icon:"🛡",label:"VLYR routes it",  sub:"Smart decision in real time"},
  {icon:"G", label:"4-5★ → Google",   sub:"Public boost to your rating"},
  {icon:"🔒",label:"1-3★ → Private", sub:"Only you get the alert"},
]

function VLYRFlow({ paused }: { paused:boolean }) {
  const [shown,setShown]=useState(0)
  useEffect(()=>{ if(paused)return; setShown(0); const ts=FLOW.map((_,i)=>setTimeout(()=>setShown(i+1),(i+1)*900)); return()=>ts.forEach(clearTimeout) },[paused])
  return (
    <div style={{position:"absolute",inset:0,background:DK,display:"flex",flexDirection:"column"}}>
      <div style={{position:"absolute",top:28,left:36,right:36,display:"flex",alignItems:"center",justifyContent:"space-between",zIndex:10}}>
        <VLogo/><span style={{color:"#444",fontSize:11,fontWeight:700,letterSpacing:"0.15em",textTransform:"uppercase"}}>The VLYR Flow</span>
      </div>
      {/* Title */}
      <div style={{padding:"88px 44px 0",flexShrink:0}}>
        <h2 style={{fontSize:50,fontWeight:900,color:"white",letterSpacing:"-0.02em",lineHeight:1.1,fontFamily:"Figtree,sans-serif"}}>
          How every<br/><span style={{color:Y}}>scan works</span>
        </h2>
      </div>
      {/* Horizontal flow — fills remaining space */}
      <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",padding:"0 36px 60px"}}>
        {/* Node row */}
        <div style={{position:"relative",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          {/* Background track */}
          <div style={{position:"absolute",left:44,right:44,top:"50%",height:4,background:"#1A1A1A",transform:"translateY(-50%)",borderRadius:2}}/>
          {/* Animated segments */}
          {FLOW.slice(0,-1).map((_,i)=>(
            <div key={i} style={{position:"absolute",height:4,borderRadius:2,overflow:"hidden",background:"#1A1A1A",
              left:`calc(${i*20+10}% + 44px)`, width:`calc(20% - 88px)`, top:"50%", transform:"translateY(-50%)"}}>
              <motion.div style={{height:"100%",background:Y,borderRadius:2}}
                animate={{width:shown>i+1?"100%":"0%"}} transition={{duration:0.5,ease:"easeInOut"}}/>
            </div>
          ))}
          {/* Nodes */}
          {FLOW.map((step,i)=>(
            <div key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",zIndex:5,flexShrink:0}}>
              <AnimatePresence>
                {shown>i?(
                  <motion.div key="on" initial={{scale:0,opacity:0}} animate={{scale:1,opacity:1}} transition={{type:"spring",stiffness:320,damping:20}}
                    style={{width:84,height:84,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",
                      background:`${Y}18`,border:`3px solid ${Y}60`,boxShadow:`0 0 40px ${Y}15`}}>
                    {step.icon==="G"
                      ?<svg width="34" height="34" viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                      :<span style={{fontSize:34}}>{step.icon}</span>}
                  </motion.div>
                ):(
                  <div style={{width:84,height:84,borderRadius:"50%",background:"#111",border:"3px solid #1F1F1F"}}/>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
        {/* Labels */}
        <div style={{display:"flex",justifyContent:"space-between",marginTop:28,padding:"0 0"}}>
          {FLOW.map((step,i)=>(
            <AnimatePresence key={i}>
              {shown>i&&<motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:0.2}} style={{width:"18%",textAlign:"center"}}>
                <p style={{fontWeight:700,fontSize:13,color:"white",lineHeight:1.3}}>{step.label}</p>
                <p style={{fontSize:12,color:"#555",marginTop:5,lineHeight:1.4}}>{step.sub}</p>
              </motion.div>}
            </AnimatePresence>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── V5: Live Shield ───────────────────────────────────────────────────────────
function useCount(t:number,d=1800){const[v,setV]=useState(0);useEffect(()=>{let s:number;const f=(ts:number)=>{if(!s)s=ts;const p=Math.min((ts-s)/d,1);setV(Math.floor((1-(1-p)**3)*t));if(p<1)requestAnimationFrame(f)};const id=requestAnimationFrame(f);return()=>cancelAnimationFrame(id)},[t,d]);return v}

function LiveShield({ paused }: { paused:boolean }) {
  const sh=useCount(1247,2200), fw=useCount(3891,2600)
  const [reviews,setReviews]=useState<Array<{id:number;good:boolean;y:number}>>([])
  const nid=useRef(0)
  useEffect(()=>{ if(paused)return; const id=setInterval(()=>{ const good=Math.random()>0.35; setReviews(p=>[...p,{id:nid.current++,good,y:Math.random()*55+22}].slice(-8)) },950); return()=>clearInterval(id) },[paused])
  return (
    <div style={{position:"absolute",inset:0,background:DK,display:"flex",flexDirection:"column"}}>
      <div style={{position:"absolute",top:28,left:36,right:36,display:"flex",alignItems:"center",justifyContent:"space-between",zIndex:10}}>
        <VLogo/>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:8,height:8,borderRadius:"50%",background:"#00c758"}} className="animate-pulse"/>
          <span style={{color:"white",fontSize:13,fontWeight:600}}>Live Protection</span>
        </div>
      </div>
      <div style={{flex:1,position:"relative",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <AnimatePresence>
          {reviews.map(r=>(
            <motion.div key={r.id} style={{position:"absolute",left:"4%",top:`${r.y}%`}}
              initial={{x:0,opacity:0,scale:0.8}}
              animate={r.good?{x:["0%","90%","180%"],opacity:[0,1,1,0],scale:[0.8,1,1,0.8]}:{x:["0%","48%","40%"],y:[0,0,20],opacity:[0,1,0],scale:[0.8,1,0]}}
              transition={{duration:2.6,ease:"easeInOut"}} exit={{opacity:0}}>
              <div style={{padding:"9px 18px",borderRadius:999,border:`1px solid ${r.good?`${Y}55`:"#FF444455"}`,
                background:r.good?`${Y}15`:"#FF444415",color:r.good?Y:"#FF6868",fontWeight:700,fontSize:15,whiteSpace:"nowrap"}}>
                {r.good?"⭐⭐⭐⭐⭐":"⭐"}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div style={{position:"relative",display:"flex",alignItems:"center",justifyContent:"center",width:290,height:290}}>
          {[330,270,210].map((d,i)=>(
            <motion.div key={i} style={{position:"absolute",width:d,height:d,borderRadius:"50%",border:`1.5px solid ${Y}`,opacity:0.1}}
              animate={{scale:[1,1.08,1],opacity:[0.1,0.03,0.1]}} transition={{duration:2.5,repeat:Infinity,delay:i*0.6}}/>
          ))}
          <div style={{width:170,height:170,borderRadius:46,background:`${Y}15`,border:`4px solid ${Y}50`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 0 80px ${Y}18`}}>
            <Shield size={76} style={{color:Y}}/>
          </div>
        </div>
      </div>
      <div style={{padding:"0 32px 80px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        {[{l:"Issues shielded",v:sh,c:Y},{l:"Sent to Google",v:fw,c:"white"}].map(({l,v,c})=>(
          <div key={l} style={{padding:"20px 24px",borderRadius:22,background:"#111",border:"1px solid #1F1F1F"}}>
            <p style={{color:"#555",fontSize:13,marginBottom:8}}>{l}</p>
            <p style={{fontSize:42,fontWeight:900,color:c,fontFamily:"Figtree,sans-serif"}}>{v.toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Panel controller ──────────────────────────────────────────────────────────
const VCOMPS=[StoryPanel,FeatureSpotlight,StatsWall,VLYRFlow,LiveShield]
const VLBLS=[{s:"Story",f:"The Story"},{s:"Features",f:"Features"},{s:"Stats",f:"By the Numbers"},{s:"Flow",f:"The VLYR Flow"},{s:"Live",f:"Live Shield"}]

function PanelController() {
  const init=useRef(Math.floor(Math.random()*VCOMPS.length)).current
  const[ai,setAi]=useState(init),[paused,setPaused]=useState(false),[menu,setMenu]=useState(false),[key,setKey]=useState(0)
  const switchTo=(i:number)=>{setAi(i);setKey(k=>k+1);setPaused(false);setMenu(false)}
  const V=VCOMPS[ai]
  return (
    <div style={{position:"absolute",inset:0}}>
      <AnimatePresence mode="wait">
        <motion.div key={key} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.4}} style={{position:"absolute",inset:0}}>
          <V paused={paused}/>
        </motion.div>
      </AnimatePresence>
      {/* Controls */}
      <div style={{position:"absolute",bottom:16,left:20,right:20,zIndex:30,display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
        <div style={{position:"relative"}}>
          <button onClick={()=>setMenu(m=>!m)} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 18px",borderRadius:999,background:"rgba(8,8,8,0.93)",backdropFilter:"blur(20px)",border:"1px solid #2A2A2A",color:"white",fontSize:13,fontWeight:600,cursor:"pointer"}}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="0" y="0" width="6" height="6" rx="1.5" fill="white" opacity="0.5"/><rect x="8" y="0" width="6" height="6" rx="1.5" fill="white" opacity="0.5"/><rect x="0" y="8" width="6" height="6" rx="1.5" fill="white" opacity="0.5"/><rect x="8" y="8" width="6" height="6" rx="1.5" fill={Y}/></svg>
            {VLBLS[ai].s}
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{transform:menu?"rotate(180deg)":"none",transition:"transform 0.2s"}}><path d="M1 1l4 4 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <AnimatePresence>
            {menu&&<motion.div initial={{opacity:0,y:10,scale:0.96}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:10,scale:0.96}}
              transition={{duration:0.2,ease:[0.34,1.56,0.64,1]}}
              style={{position:"absolute",bottom:"calc(100% + 8px)",left:0,borderRadius:18,overflow:"hidden",background:"rgba(14,14,14,0.98)",backdropFilter:"blur(30px)",border:"1px solid #2A2A2A",minWidth:220,boxShadow:"0 20px 60px rgba(0,0,0,0.7)"}}>
              <div style={{padding:"12px 16px 8px",borderBottom:"1px solid #1F1F1F"}}>
                <p style={{color:"#555",fontSize:11,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase"}}>Choose animation</p>
              </div>
              {VLBLS.map((v,i)=>(
                <button key={i} onClick={()=>switchTo(i)} style={{width:"100%",display:"flex",alignItems:"center",gap:12,padding:"12px 16px",textAlign:"left",cursor:"pointer",background:i===ai?`${Y}10`:"transparent",border:"none"}}>
                  <div style={{width:28,height:28,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",background:i===ai?Y:"#2A2A2A",color:i===ai?DK:"#888",fontSize:13,fontWeight:900,flexShrink:0}}>{i+1}</div>
                  <span style={{color:i===ai?Y:"white",fontWeight:600,fontSize:14}}>{v.f}</span>
                  {i===ai&&<svg style={{marginLeft:"auto"}} width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7l3.5 3.5L12 3.5" stroke={Y} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </button>
              ))}
            </motion.div>}
          </AnimatePresence>
        </div>
        <button onClick={()=>setPaused(p=>!p)} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 18px",borderRadius:999,background:"rgba(8,8,8,0.93)",backdropFilter:"blur(20px)",border:"1px solid #2A2A2A",color:"white",fontSize:13,fontWeight:600,cursor:"pointer"}}>
          {paused?<svg width="12" height="14" viewBox="0 0 12 14" fill="white"><path d="M0 0L12 7 0 14z"/></svg>:<><div style={{width:3,height:13,borderRadius:2,background:"white"}}/><div style={{width:3,height:13,borderRadius:2,background:"white",marginLeft:3}}/></>}
          {paused?"Resume":"Pause"}
        </button>
      </div>
      {menu&&<div style={{position:"absolute",inset:0,zIndex:20}} onClick={()=>setMenu(false)}/>}
    </div>
  )
}

// ── Live dashboard ────────────────────────────────────────────────────────────
const FITEMS=[
  {icon:"⭐",text:"5★ posted to Google Reviews",sub:"Maria K. · now",c:Y},
  {icon:"🛡",text:"Feedback captured privately", sub:"Anonymous · now",c:Y},
  {icon:"📱",text:"New scan — storefront",       sub:"just now",      c:"#555"},
  {icon:"⭐",text:"4★ posted to Google Reviews",sub:"James T. · now",c:Y},
  {icon:"🛡",text:"Issue resolved before Google",sub:"Customer · now", c:Y},
]

function LiveDashboard({rating,totalReviews,businessName}:{rating:number;totalReviews:number;businessName:string}){
  const[tab,setTab]=useState<"feed"|"sim">("feed")
  const sc=useCount(47,1600),sh=useCount(12,1800)
  const[feed,setFeed]=useState(FITEMS.slice(0,3).map((f,i)=>({...f,id:i})))
  const[nid,setNid]=useState(20)
  const[pos,setPos]=useState(0),[neg,setNeg]=useState(0)
  const pN=(pos===0&&neg===0)?rating:(rating*totalReviews+pos*5+neg)/(totalReviews+pos+neg)
  const pW=(()=>{const n=Math.ceil(neg*0.27);const p=Math.round(pos*2);const c=totalReviews+p+n;return c===0?rating:(rating*totalReviews+p*5+n)/c})()
  useEffect(()=>{const id=setInterval(()=>{const item=FITEMS[nid%FITEMS.length];setFeed(p=>[{...item,id:nid},...p].slice(0,4));setNid(n=>n+1)},2600);return()=>clearInterval(id)},[nid])
  return(
    <div style={{position:"absolute",inset:0,background:DK,display:"flex",flexDirection:"column"}}>
      <div style={{padding:"32px 32px 0",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:20}}>
          <div><VLogo/><h2 style={{fontSize:22,fontWeight:800,color:"white",marginTop:10,maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{businessName}</h2></div>
          <div style={{textAlign:"right"}}><div style={{fontSize:54,fontWeight:900,color:Y,lineHeight:1}}>{rating.toFixed(1)}</div><div style={{display:"flex",gap:2,justifyContent:"flex-end",marginTop:6}}><Stars n={Math.round(rating)} size={13}/></div><p style={{fontSize:13,color:"#555",marginTop:4}}>{totalReviews} reviews</p></div>
        </div>
        <div style={{display:"flex",borderBottom:"1px solid #181818"}}>
          {([["feed","Live Feed",Zap],["sim","Simulator",BarChart3]] as const).map(([id,label,Icon])=>(
            <button key={id} onClick={()=>setTab(id)} style={{display:"flex",alignItems:"center",gap:6,padding:"12px 20px",fontSize:14,fontWeight:600,color:tab===id?"white":"#555",border:"none",background:"transparent",cursor:"pointer",position:"relative"}}>
              <Icon size={14}/>{label}
              {tab===id&&<motion.div layoutId="dt" style={{position:"absolute",bottom:0,left:0,right:0,height:2,background:Y}}/>}
            </button>
          ))}
        </div>
      </div>
      <div style={{flex:1,overflow:"hidden",padding:"20px 32px 32px"}}>
        <AnimatePresence mode="wait">
          {tab==="feed"&&(
            <motion.div key="f" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} style={{height:"100%",display:"flex",flexDirection:"column",gap:16}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                {[{l:"Today's scans",v:sc,c:"white",I:TrendingUp},{l:"Issues shielded",v:sh,c:Y,I:Shield}].map(({l,v,c,I})=>(
                  <div key={l} style={{padding:"18px 20px",borderRadius:20,background:"#111",border:"1px solid #1F1F1F"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}><div style={{width:28,height:28,borderRadius:10,background:`${Y}12`,display:"flex",alignItems:"center",justifyContent:"center"}}><I size={15} style={{color:Y}}/></div><span style={{color:"#555",fontSize:13}}>{l}</span></div>
                    <div style={{fontSize:44,fontWeight:900,color:c,fontFamily:"Figtree,sans-serif"}}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{flex:1,overflow:"hidden"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                  <motion.div animate={{scale:[1,1.4,1],opacity:[1,0.4,1]}} transition={{duration:1.5,repeat:Infinity}} style={{width:8,height:8,borderRadius:"50%",background:"#00c758"}}/>
                  <span style={{fontSize:13,fontWeight:700,color:"#555",letterSpacing:"0.1em",textTransform:"uppercase"}}>Live Activity</span>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  <AnimatePresence initial={false}>
                    {feed.map(item=>(
                      <motion.div key={item.id} initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} exit={{opacity:0,height:0}} transition={{duration:0.3}}
                        style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderRadius:16,background:"#111",border:"1px solid #1F1F1F",overflow:"hidden"}}>
                        <span style={{fontSize:22,flexShrink:0}}>{item.icon}</span>
                        <div style={{flex:1,minWidth:0}}><p style={{fontSize:14,fontWeight:500,color:"white",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.text}</p><p style={{fontSize:12,color:"#555"}}>{item.sub}</p></div>
                        <div style={{width:8,height:8,borderRadius:"50%",flexShrink:0,background:item.c}}/>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}
          {tab==="sim"&&(
            <motion.div key="s" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} style={{height:"100%",display:"flex",flexDirection:"column",gap:16,overflowY:"auto"}}>
              <div style={{padding:20,borderRadius:20,background:"#111",border:"1px solid #1F1F1F"}}>
                <p style={{fontSize:12,color:"#555",letterSpacing:"0.15em",textTransform:"uppercase",fontWeight:700,marginBottom:16}}>Projected Rating</p>
                <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:12,alignItems:"center",textAlign:"center"}}>
                  <div><p style={{fontSize:13,color:"#555",marginBottom:6}}>Current</p><div style={{fontSize:32,fontWeight:900,color:"white"}}>{rating.toFixed(1)}</div></div>
                  <div style={{fontSize:24,color:"#333"}}>→</div>
                  <div><p style={{fontSize:13,color:"#555",marginBottom:6}}>Without VLYR</p><motion.div key={pN.toFixed(1)} initial={{scale:1.2}} animate={{scale:1}} style={{fontSize:32,fontWeight:900,color:pN<rating-0.05?"#f87171":pN>rating+0.05?"#00c758":"white"}}>{pN.toFixed(1)}</motion.div></div>
                </div>
                {(pos>0||neg>0)&&<motion.div initial={{opacity:0}} animate={{opacity:1}} style={{marginTop:16,paddingTop:16,borderTop:"1px solid #1F1F1F",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div><p style={{fontSize:15,fontWeight:700,color:Y}}>With VLYR</p><p style={{fontSize:13,color:"#555"}}>73% blocked · 2× more positive</p></div>
                  <motion.div key={pW.toFixed(2)} initial={{scale:1.15}} animate={{scale:1}} style={{fontSize:36,fontWeight:900,color:Y,fontFamily:"Figtree,sans-serif"}}>{pW.toFixed(1)}</motion.div>
                </motion.div>}
              </div>
              {[{l:"Add 5-star reviews",icon:"⭐",v:pos,set:setPos,max:50,c:"#00c758"},{l:"Simulate bad reviews",icon:"★",v:neg,set:setNeg,max:20,c:"#f87171"}].map(({l,icon,v,set,max,c})=>(
                <div key={l} style={{padding:"16px 20px",borderRadius:20,background:"#111",border:"1px solid #1F1F1F",display:"flex",flexDirection:"column",gap:12}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:18}}>{icon}</span><span style={{fontSize:15,fontWeight:600,color:"white"}}>{l}</span></div><span style={{fontSize:15,fontWeight:700,color:c}}>+{v}</span></div>
                  <input type="range" min={0} max={max} value={v} onChange={e=>set(+e.target.value)} style={{width:"100%",accentColor:c,height:6}}/>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ── Export ────────────────────────────────────────────────────────────────────
export function OnboardingMarketingPanel({isVerified=false,businessRating=4.7,totalReviews=62,businessName="Your Business"}:Props){
  return(
    <div style={{position:"relative",width:"100%",height:"100%"}}>
      {isVerified?<LiveDashboard rating={businessRating} totalReviews={totalReviews} businessName={businessName}/>:<PanelController/>}
    </div>
  )
}
