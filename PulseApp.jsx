import { useState, useEffect, useRef } from "react";

// ─── CONFIG ────────────────────────────────────────

// ─── Get a FREE TMDb API key at themoviedb Settings API ────────────────────────────────────────
const TMDB_API_KEY = "1c89ee56a61436b0a2c976785bb9f694";
const TMDB_BASE    = "https://api.themoviedb.org/3";
const TMDB_IMG     = "https://image.tmdb.org/t/p/w500";

const COUNTRY_REGION = {
  american:"US", indian:"IN", british:"GB",
  korean:"KR", french:"FR", japanese:"JP",
};

// Theaters fetched live via geolocation (fetchNearbyTheaters)
// Static fallback used when geolocation is unavailable
const FALLBACK_THEATERS = [
  {name:"Emagine Canton",          address:"39535 Ford Rd, Canton, MI",         distance:"1.2 mi", website:"https://www.emagine-entertainment.com/theatres/emagine-canton/"},
  {name:"AMC Star Great Lakes 25", address:"4200 Baldwin Rd, Auburn Hills, MI", distance:"2.1 mi", website:"https://www.amctheatres.com/movie-theatres/detroit/amc-star-great-lakes-25"},
  {name:"Cinemark Birch Run",      address:"12225 Beyer Rd, Birch Run, MI",     distance:"3.4 mi", website:"https://www.cinemark.com/theatre/cinemark-birch-run"},
  {name:"Regal Ann Arbor 20",      address:"4100 Carpenter Rd, Ypsilanti, MI",  distance:"4.8 mi", website:"https://www.regmovies.com/theaters/regal-ann-arbor/"},
];
const GENERIC_SHOWTIMES = ["12:00 PM","3:30 PM","7:00 PM","10:00 PM"];

const SECOND_COUNTRY_OPTIONS = [
  { key:"IN", label:"India",        flag:"🇮🇳", tz:"Asia/Kolkata",        locale:"en-IN", lat:17.3850, lng:78.4867, city:"Hyderabad" },
];

const GENRE_MAP = {
  28:"Action",18:"Drama",35:"Comedy",27:"Horror",878:"Sci-Fi",
  10749:"Romance",53:"Thriller",16:"Animation",12:"Adventure",
  14:"Fantasy",9648:"Mystery",10752:"War",10402:"Music",37:"Western",
  36:"History",99:"Documentary",10751:"Family",80:"Crime",
};

function genreEmoji(genres=[]) {
  const g = genres.map(x=>(x.name||x).toLowerCase()).join(" ");
  if (g.includes("horror"))    return "👻";
  if (g.includes("sci-fi")||g.includes("science fiction")) return "👽";
  if (g.includes("action"))    return "💥";
  if (g.includes("animation")) return "🎨";
  if (g.includes("comedy"))    return "😂";
  if (g.includes("romance"))   return "❤️";
  if (g.includes("thriller"))  return "😱";
  if (g.includes("drama"))     return "🎭";
  if (g.includes("family"))    return "👨‍👩‍👧";
  if (g.includes("fantasy"))   return "🧙";
  if (g.includes("mystery"))   return "🔍";
  if (g.includes("war"))       return "🪖";
  if (g.includes("music"))     return "🎵";
  if (g.includes("western"))   return "🤝 ";
  return "🎬";
}

function ratingColor(vote) {
  if (vote >= 8) return "#00C864";
  if (vote >= 7) return "#FFB800";
  if (vote >= 6) return "#FF6B35";
  return "#FF3B5C";
}

function fmtRuntime(mins) {
  if (!mins) return "";
  return `${Math.floor(mins/60)}h ${mins%60}m`;
}

function tmdbMovieToCard(m, badge="NOW PLAYING", liveTheaters=null) {
  const genres     = (m.genre_ids||[]).map(id => GENRE_MAP[id]).filter(Boolean);
  const genreLabel = genres.slice(0,2).join(" · ") || "Drama";
  const color      = ratingColor(m.vote_average);
  const emoji      = genreEmoji(genres);
  // Attach live theaters for the detail view — but don't assign a specific theater to the card
  const theaterList = (liveTheaters && liveTheaters.length > 0) ? liveTheaters : FALLBACK_THEATERS;
  const allTheaters = theaterList.map(th => ({
    ...th,
    showTimes: th.showTimes || GENERIC_SHOWTIMES,
  }));
  const released = m.release_date ? new Date(m.release_date).toLocaleDateString("en-US",{month:"short",day:"numeric"}) : "";
  return {
    id: m.id, title: m.title || m.name, genreLabel,
    rating:  m.vote_average?.toFixed(1) || "N/A",
    duration: fmtRuntime(m.runtime),
    badge, color, emoji,
    released,
    desc: m.overview || "",
    poster: m.poster_path ? `${TMDB_IMG}${m.poster_path}` : null,
    allTheaters,
    theaterCount: allTheaters.length,
  };
}

const OTT_CATEGORIES = [
  { id:"global", label:"Global", flag:"🌍" },
  { id:"indian", label:"Indian", flag:"🇮🇳" },
];

// No hardcoded OTT fallback — always use live TMDb data

// ─── FAMILY WORKSPACE CONFIG ────────────────────────────────────────
const FAMILY_CLIENT_ID   = "360320151404-1miklman0sr6gends9nuuuggecauneea.apps.googleusercontent.com";
const FAMILY_SCOPES      = "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send";
const WORKSPACE_FOLDER   = "PulseApp_Workspace";
const WORKSPACE_FILES    = { grocery:"Grocery.json", todos:"Todo.json", appointments:"Appointments.json", members:"Members.json", periods:"Periods.json", pregnancy:"Pregnancy.json", contacts:"Contacts.json", payReminders:"PayReminders.json", moneyLent:"MoneyLent.json" };

// ─── PINGME CONFIG ────────────────────────────────────────
const PING_BASE     = "https://pulse-family-default-rtdb.firebaseio.com/pingme";
const PING_USERS    = `${PING_BASE}/users`;
const PING_CHATS    = `${PING_BASE}/chats`;
const PING_GROUPS   = `${PING_BASE}/groups`;
const PING_PRESENCE = `${PING_BASE}/presence`;
const FAMILY_BASE   = "https://pulse-family-default-rtdb.firebaseio.com/family";

function pingAvatar(name="?", color="#FF3B5C") {
  return (
    <div style={{width:42,height:42,borderRadius:21,background:color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:800,color:"#fff",flexShrink:0}}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function pingTimeStr(ts) {
  if (!ts) return "";
  const d = new Date(ts), now = new Date();
  const diff = now - d;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff/60000)}m`;
  if (diff < 86400000) return d.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",hour12:true});
  return d.toLocaleDateString([],{month:"short",day:"numeric"});
}

const PING_COLORS = ["#FF3B5C","#7C3AED","#00C2FF","#10B981","#F59E0B","#EC4899","#06B6D4","#84CC16"];

const GROCERY_STORES_DEFAULT = [
  { id:"all",          label:"All",          emoji:"🔍️", color:"#888" },
  { id:"Walmart",      label:"Walmart",      emoji:"🛒", color:"#0071CE" },
  { id:"Target",       label:"Target",       emoji:"🎯", color:"#CC0000" },
  { id:"Indian Store", label:"Indian Store", emoji:"🏪️", color:"#FF6B00" },
  { id:"Costco",       label:"Costco",       emoji:"📦", color:"#005DAA" },
  { id:"Medical",      label:"Medical",      emoji:"💊", color:"#E11D48" },
  { id:"Others",       label:"Others",       emoji:"📌", color:"#6B7280" },
];
const STORE_COLORS = ["#10B981","#F59E0B","#8B5CF6","#EC4899","#06B6D4","#84CC16","#F97316","#EF4444"];

const PLATFORM_COLORS = {
  "Netflix":"#E50914", "Apple TV+":"#a0a0a0", "Prime Video":"#00A8E1",
  "Disney+":"#113CFC", "HBO Max":"#8C1AFF", "Max":"#8C1AFF", "Hulu":"#1CE783",
  "SonyLIV":"#003087", "TVF Play":"#FF6B35", "Hotstar":"#1A56DB", "ZEE5":"#8B2FC9",
  "JioCinema":"#0057FF", "JioHotstar":"#6B21A8", "Peacock":"#000000", "Paramount+":"#0064FF", "Crunchyroll":"#F47521",
};

// Platform search URL builders — always open to a search page so the movie is found
function platformSearchUrl(platform, title) {
  const q = encodeURIComponent(title);
  switch(platform) {
    case "Netflix":     return `https://www.netflix.com/search?q=${q}`;
    case "Prime Video": return `https://www.amazon.com/s?k=${q}&i=instant-video`;
    case "Apple TV+":   return `https://tv.apple.com/search?term=${q}`;
    case "Disney+":     return `https://www.disneyplus.com/search/${q}`;
    case "HBO Max":     return `https://play.max.com/search?q=${q}`;
    case "Max":         return `https://play.max.com/search?q=${q}`;
    case "Hulu":        return `https://www.hulu.com/search?q=${q}`;
    case "Peacock":     return `https://www.peacocktv.com/search?q=${q}`;
    case "SonyLIV":     return `https://www.sonyliv.com/search?query=${q}`;
    case "TVF Play":    return `https://www.tvfplay.com/search?q=${q}`;
    case "Hotstar":     return `https://www.hotstar.com/in/search?q=${q}`;
    case "JioCinema":   return `https://www.jiocinema.com/search?q=${q}`;
    case "JioHotstar":   return `https://www.jiohotstar.com/search?q=${q}`;
    case "ZEE5":        return `https://www.zee5.com/search?q=${q}`;
    default:            return `https://www.google.com/search?q=${encodeURIComponent(title+' '+platform+' watch online')}`;
  }
}

// Deep link configs for OTT platforms — app scheme, store links, web fallback
const OTT_APP_LINKS = {
  "Netflix":      { scheme:"nflx://", appStore:"https://apps.apple.com/app/netflix/id363590051", playStore:"https://play.google.com/store/apps/details?id=com.netflix.mediaclient", web:"https://www.netflix.com" },
  "Prime Video":  { scheme:"intent://www.primevideo.com/#Intent;scheme=https;package=com.amazon.avod.thirdpartyclient;end", appStore:"https://apps.apple.com/app/amazon-prime-video/id545519333", playStore:"https://play.google.com/store/apps/details?id=com.amazon.avod.thirdpartyclient", web:"https://www.primevideo.com" },
  "Disney+":      { scheme:"disneyplus://", appStore:"https://apps.apple.com/app/disney/id1446075923", playStore:"https://play.google.com/store/apps/details?id=com.disney.disneyplus", web:"https://www.disneyplus.com" },
  "Max":          { scheme:"hbomax://", appStore:"https://apps.apple.com/app/max-stream-hbo-tv-movies/id1666653815", playStore:"https://play.google.com/store/apps/details?id=com.wbd.stream", web:"https://play.max.com" },
  "HBO Max":      { scheme:"hbomax://", appStore:"https://apps.apple.com/app/max-stream-hbo-tv-movies/id1666653815", playStore:"https://play.google.com/store/apps/details?id=com.wbd.stream", web:"https://play.max.com" },
  "Hulu":         { scheme:"hulu://", appStore:"https://apps.apple.com/app/hulu-watch-tv-shows-movies/id376510438", playStore:"https://play.google.com/store/apps/details?id=com.hulu.plus", web:"https://www.hulu.com" },
  "Apple TV+":    { scheme:"videos://", appStore:"https://apps.apple.com/app/apple-tv/id1174078549", playStore:"https://play.google.com/store/apps/details?id=com.apple.atve.androidtv.appletv", web:"https://tv.apple.com" },
  "Peacock":      { scheme:"peacock://", appStore:"https://apps.apple.com/app/peacock-tv-stream-tv-movies/id1508186374", playStore:"https://play.google.com/store/apps/details?id=com.peacocktv.peacockandroid", web:"https://www.peacocktv.com" },
  "Paramount+":   { scheme:"paramountplus://", appStore:"https://apps.apple.com/app/paramount/id685702757", playStore:"https://play.google.com/store/apps/details?id=com.cbs.ott", web:"https://www.paramountplus.com" },
  "JioHotstar":   { scheme:"hotstar://", appStore:"https://apps.apple.com/app/jiohotstar/id395649498", playStore:"https://play.google.com/store/apps/details?id=in.startv.hotstar", web:"https://www.jiohotstar.com" },
  "SonyLIV":      { scheme:"sonyliv://", appStore:"https://apps.apple.com/app/sonyliv-originals-hollywood/id459407215", playStore:"https://play.google.com/store/apps/details?id=com.sonyliv", web:"https://www.sonyliv.com" },
  "ZEE5":         { scheme:"zee5://", appStore:"https://apps.apple.com/app/zee5-movies-web-series-shows/id743691886", playStore:"https://play.google.com/store/apps/details?id=com.graymatrix.did", web:"https://www.zee5.com" },
  "JioCinema":    { scheme:"jiocinema://", appStore:"https://apps.apple.com/app/jiocinema/id1065682719", playStore:"https://play.google.com/store/apps/details?id=com.jio.media.ondemand", web:"https://www.jiocinema.com" },
  "Crunchyroll":  { scheme:"crunchyroll://", appStore:"https://apps.apple.com/app/crunchyroll/id329913454", playStore:"https://play.google.com/store/apps/details?id=com.crunchyroll.crunchyroid", web:"https://www.crunchyroll.com" },
};

function openOTTApp(platform, title, watchLink) {
  const links = OTT_APP_LINKS[platform];
  if (!links) {
    // No app config — fall back to web
    window.open(watchLink || platformSearchUrl(platform, title), "_blank");
    return;
  }

  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent || "");
  const isAndroid = /Android/i.test(navigator.userAgent || "");
  const webUrl = watchLink || platformSearchUrl(platform, title);
  const storeUrl = isIOS ? links.appStore : (isAndroid ? links.playStore : webUrl);

  if (!isIOS && !isAndroid) {
    // Desktop — just open web
    window.open(webUrl, "_blank");
    return;
  }

  // Try deep link first
  const startTime = Date.now();
  const appScheme = links.scheme;

  // For Android intents, use the intent URL directly
  if (isAndroid && appScheme.startsWith("intent://")) {
    window.location.href = appScheme;
    setTimeout(() => {
      if (Date.now() - startTime < 2500) {
        // App didn't open — offer to install
        if (confirm(`${platform} app is not installed. Would you like to install it?`)) {
          window.open(storeUrl, "_blank");
        } else {
          window.open(webUrl, "_blank");
        }
      }
    }, 1500);
    return;
  }

  // iOS and other Android schemes
  window.location.href = appScheme;
  setTimeout(() => {
    if (Date.now() - startTime < 2500) {
      // App didn't open — offer to install
      if (confirm(`${platform} app is not installed. Would you like to install it from the ${isIOS ? "App Store" : "Play Store"}?`)) {
        window.open(storeUrl, "_blank");
      } else {
        window.open(webUrl, "_blank");
      }
    }
  }, 1500);
}

// ─── DATA ────────────────────────────────────────

function TheaterMovieCard({ movie, index, onTap, T, isDark }) {
  const [pressed, setPressed] = useState(false);
  const tsRef = useRef(null);
  return (
    <div
      onClick={()=>onTap(movie)}
      onMouseDown={()=>setPressed(true)} onMouseUp={()=>setPressed(false)} onMouseLeave={()=>setPressed(false)}
      onTouchStart={e=>{tsRef.current={y:e.touches[0].clientY};setPressed(true);}}
      onTouchMove={e=>{if(tsRef.current&&Math.abs(e.touches[0].clientY-tsRef.current.y)>8){setPressed(false);tsRef.current=null;}}}
      onTouchEnd={()=>{setPressed(false);tsRef.current=null;}}
      style={{background:isDark?T.bgCard:"#fff",borderRadius:16,padding:"14px",marginBottom:12,border:isDark?`1px solid ${T.border}`:"1px solid rgba(0,0,0,0.04)",borderLeft:`3px solid ${movie.color}`,boxShadow:isDark?"none":"0 1px 4px rgba(0,0,0,0.06)",cursor:"pointer",transform:pressed?"scale(0.98)":"scale(1)",transition:"all 0.15s ease",animation:`slideUp 0.35s ease ${index*0.06}s both`}}
    >
      <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
        {/* Movie Poster */}
        <div style={{width:60,height:80,borderRadius:10,background:`${movie.color}15`,border:`1px solid ${movie.color}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0,overflow:"hidden"}}>
          {movie.poster
            ? <img src={movie.poster} alt={movie.title} style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:10}} />
            : movie.emoji}
        </div>
        <div style={{flex:1,minWidth:0}}>
          {/* Badge + Rating row */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
            <span style={{fontSize:9,fontWeight:800,letterSpacing:"0.08em",color:movie.color,background:`${movie.color}18`,padding:"3px 8px",borderRadius:20,textTransform:"uppercase"}}>{movie.badge}</span>
            <div style={{display:"flex",alignItems:"center",gap:3}}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#FACC15" stroke="#FACC15" strokeWidth="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              <span style={{fontSize:13,fontWeight:800,color:T.text}}>{movie.rating}</span>
            </div>
          </div>
          {/* Title */}
          <h3 style={{margin:"0 0 3px",fontSize:15,fontWeight:800,color:T.text,letterSpacing:"-0.01em",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{movie.title}</h3>
          {/* Genre + Duration */}
          <p style={{margin:"0 0 5px",fontSize:11,color:T.textMuted}}>{movie.genreLabel || movie.genre} · {movie.duration}</p>
          {/* Release date + Theaters count */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            {movie.released && <span style={{fontSize:10,color:T.textFaint}}>Released {movie.released}</span>}
            {movie.theaterCount > 0 && (
              <span style={{fontSize:9,fontWeight:700,color:movie.color,background:`${movie.color}12`,padding:"2px 8px",borderRadius:10}}>{movie.theaterCount} theaters nearby</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function OTTMovieCard({ movie, index, onTap, T, isDark }) {
  const [pressed, setPressed] = useState(false);
  const pColor = PLATFORM_COLORS[movie.platform] || "#888";
  const tsRef = useRef(null);
  return (
    <div
      onClick={()=>onTap(movie)}
      onMouseDown={()=>setPressed(true)} onMouseUp={()=>setPressed(false)} onMouseLeave={()=>setPressed(false)}
      onTouchStart={e=>{tsRef.current={y:e.touches[0].clientY};setPressed(true);}}
      onTouchMove={e=>{if(tsRef.current&&Math.abs(e.touches[0].clientY-tsRef.current.y)>8){setPressed(false);tsRef.current=null;}}}
      onTouchEnd={()=>{setPressed(false);tsRef.current=null;}}
      style={{background:isDark?T.bgCard:"#fff",borderRadius:16,padding:"14px",marginBottom:12,border:isDark?`1px solid ${T.border}`:"1px solid rgba(0,0,0,0.04)",borderLeft:`3px solid ${pColor}`,boxShadow:isDark?"none":"0 1px 4px rgba(0,0,0,0.06)",cursor:"pointer",transform:pressed?"scale(0.98)":"scale(1)",transition:"all 0.15s ease",animation:`slideUp 0.35s ease ${index*0.06}s both`}}
    >
      <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
        <div style={{width:60,height:80,borderRadius:10,background:`${pColor}15`,border:`1px solid ${pColor}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0,overflow:"hidden"}}>
          {movie.poster
            ? <img src={movie.poster} alt={movie.title} style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:10}} />
            : movie.emoji}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
            <span style={{fontSize:9,fontWeight:800,letterSpacing:"0.08em",color:pColor,background:`${pColor}18`,padding:"3px 8px",borderRadius:20,textTransform:"uppercase",display:"flex",alignItems:"center",gap:3}}>
              {movie.platform}
              {movie.hasRealProvider && <span style={{fontSize:8,color:"#10B981"}} title="Confirmed on this platform">✔</span>}
            </span>
            <div style={{display:"flex",alignItems:"center",gap:3}}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#FACC15" stroke="#FACC15" strokeWidth="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              <span style={{fontSize:13,fontWeight:800,color:T.text}}>{movie.rating}</span>
            </div>
          </div>
          <h3 style={{margin:"0 0 3px",fontSize:15,fontWeight:800,color:T.text,letterSpacing:"-0.01em",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{movie.title}</h3>
          <p style={{margin:"0 0 5px",fontSize:11,color:T.textMuted}}>{movie.genreLabel || movie.genre} · {movie.duration}</p>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{fontSize:10,color:T.textFaint}}>Released {movie.released}</span>
            <span style={{fontSize:9,fontWeight:800,color:movie.color||pColor,background:`${movie.color||pColor}18`,padding:"2px 8px",borderRadius:20,textTransform:"uppercase",letterSpacing:"0.08em"}}>{movie.badge}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const THEATER_LINKS = {
  "Emagine Canton": {
    app: "emagine://",
    appStore: "https://apps.apple.com/us/app/emagine-entertainment/id1492652710",
    playStore: "https://play.google.com/store/apps/details?id=com.emagine.entertainment",
    web: "https://www.emagine-entertainment.com/theatres/emagine-canton/",
  },
  "AMC Star Great Lakes 25": {
    app: "amctheatres://",
    appStore: "https://apps.apple.com/us/app/amc-theatres/id378020081",
    playStore: "https://play.google.com/store/apps/details?id=com.amctheatres.android",
    web: "https://www.amctheatres.com/movie-theatres/detroit/amc-star-great-lakes-25",
  },
  "Cinemark Birch Run": {
    app: "cinemark://",
    appStore: "https://apps.apple.com/us/app/cinemark-movies-theaters/id832138101",
    playStore: "https://play.google.com/store/apps/details?id=com.cinemark.mobile",
    web: "https://www.cinemark.com/theatre/cinemark-birch-run",
  },
  "Regal Ann Arbor 20": {
    app: "regmovies://",
    appStore: "https://apps.apple.com/us/app/regal-movies/id393244540",
    playStore: "https://play.google.com/store/apps/details?id=com.regal.android",
    web: "https://www.regmovies.com/theaters/regal-ann-arbor/",
  },
};

function openTheater(theaterName, preferApp) {
  const links = THEATER_LINKS[theaterName];
  if (!links) return;
  if (preferApp && links.app) {
    // Try to open the app; fall back to web after a short delay if app not installed
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent || "");
    const isAndroid = /Android/i.test(navigator.userAgent || "");
    const storeUrl = isIOS ? links.appStore : (isAndroid ? links.playStore : links.web);
    const t = Date.now();
    window.location.href = links.app;
    setTimeout(() => {
      if (Date.now() - t < 2000) {
        // App didn't open — go to store or web
        window.open(storeUrl || links.web, "_blank");
      }
    }, 1200);
  } else {
    window.open(links.web, "_blank");
  }
}

function MovieDetailModal({ movie, onClose, isOTT, T, isDark }) {
  const [booking, setBooking] = useState(null);
  const color = isOTT ? (PLATFORM_COLORS[movie.platform] || "#888") : movie.color;
  const theaters = movie.allTheaters || (movie.theater ? [{name:movie.theater,address:"",distance:movie.distance,showTimes:movie.showTimes}] : []);

  const webHref = booking ? ((THEATER_LINKS[booking.theater] || {}).web || "#") : "#";

  return (
    <div style={{position:"absolute",inset:0,zIndex:200,background:T.bg,borderRadius:"inherit",animation:"slideInUp 0.3s cubic-bezier(0.34,1.56,0.64,1)",overflowY:"auto",display:"flex",flexDirection:"column"}}>

      {/* Booking bottom sheet — stays inside phone shell */}
      {booking && (
        <div style={{position:"absolute",inset:0,zIndex:999,display:"flex",flexDirection:"column",justifyContent:"flex-end",background:"rgba(0,0,0,0.6)",backdropFilter:"blur(4px)"}} onClick={()=>setBooking(null)}>
          <div style={{background:isDark?"#13151A":"#ffffff",borderRadius:"24px 24px 0 0",padding:"20px 20px 32px",border:`1px solid ${T.border}`}} onClick={e=>e.stopPropagation()}>
            {/* Handle */}
            <div style={{width:36,height:4,background:isDark?"rgba(255,255,255,0.2)":"rgba(0,0,0,0.15)",borderRadius:2,margin:"0 auto 18px"}}/>
            {/* Info */}
            <div style={{fontSize:10,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:700,marginBottom:5}}>Book your ticket</div>
            <div style={{fontSize:18,fontWeight:800,color:T.text,marginBottom:3}}>{movie.title}</div>
            <div style={{fontSize:13,color:color,fontWeight:700,marginBottom:2}}>{booking.theater}</div>
            <div style={{fontSize:13,color:T.textMuted,marginBottom:20}}>Today · {booking.time}</div>
            {/* ─── CTA ────────────────────────────────────────s */}
            {(() => {
              const links = THEATER_LINKS[booking.theater] || {};
              const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent || "");
              const isAndroid = /Android/i.test(navigator.userAgent || "");
              const hasApp = !!links.app;
              const bookingWebUrl = booking.website || links.web || "";
              const bookingMapsUrl = booking.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.theater)}`;
              const ticketSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(booking.theater + " " + movie.title + " tickets")}`;
              return (
                <>
                  {hasApp && (
                    <div onClick={()=>openTheater(booking.theater, true)} style={{background:`linear-gradient(135deg,${color},${color}cc)`,borderRadius:16,padding:"16px",textAlign:"center",marginBottom:10,cursor:"pointer"}}>
                      <div style={{fontSize:15,fontWeight:800,color:"#ffffff"}}>📍± Open in {booking.theater.split(" ")[0]} App</div>
                      <div style={{fontSize:11,color:"rgba(255,255,255,0.7)",marginTop:3}}>Opens app · falls back to App Store if not installed</div>
                    </div>
                  )}
                  {bookingWebUrl ? (
                    <a href={bookingWebUrl} target="_blank" rel="noopener noreferrer" style={{display:"block",textDecoration:"none",marginBottom:10}}>
                      <div style={{background:hasApp?(isDark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.05)"):`linear-gradient(135deg,${color},${color}cc)`,borderRadius:16,padding:"14px",textAlign:"center",border:hasApp?`1px solid ${T.border}`:"none"}}>
                        <div style={{fontSize:14,fontWeight:700,color:hasApp?T.text:"#fff"}}>🎟️ Buy Tickets — {booking.theater.split(" ")[0]}</div>
                      </div>
                    </a>
                  ) : (
                    <a href={ticketSearchUrl} target="_blank" rel="noopener noreferrer" style={{display:"block",textDecoration:"none",marginBottom:10}}>
                      <div style={{background:`linear-gradient(135deg,${color},${color}cc)`,borderRadius:16,padding:"14px",textAlign:"center"}}>
                        <div style={{fontSize:14,fontWeight:700,color:"#fff"}}>🎟️ Search Tickets on Google</div>
                      </div>
                    </a>
                  )}
                  <a href={bookingMapsUrl} target="_blank" rel="noopener noreferrer" style={{display:"block",textDecoration:"none",marginBottom:10}}>
                    <div style={{background:isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.04)",borderRadius:16,padding:"12px",textAlign:"center",border:`1px solid ${T.border}`}}>
                      <div style={{fontSize:13,fontWeight:700,color:T.text}}>📍 Get Directions</div>
                    </div>
                  </a>
                </>
              );
            })()}
            <div onClick={()=>setBooking(null)} style={{textAlign:"center",padding:"10px",cursor:"pointer",fontSize:14,color:T.textFaint,fontWeight:600}}>Cancel</div>
          </div>
        </div>
      )}
      <div style={{position:"sticky",top:0,background:T.bg,padding:"16px 20px 10px",zIndex:10,borderBottom:`1px solid ${T.border}`}}>
        <button onClick={onClose} style={{background:isDark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.05)",border:"none",borderRadius:24,color:T.textMuted,padding:"8px 16px 8px 12px",cursor:"pointer",fontSize:14,fontWeight:700,display:"flex",alignItems:"center",gap:4}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>Back</button>
      </div>
      <div style={{padding:"20px 20px 40px"}}>
        {/* Header */}
        <div style={{display:"flex",gap:16,alignItems:"flex-start",marginBottom:18}}>
          <div style={{width:80,height:110,borderRadius:14,background:`${color}15`,border:`1px solid ${color}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,flexShrink:0,overflow:"hidden"}}>
            {movie.poster
              ? <img src={movie.poster} alt={movie.title} style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:14}} />
              : movie.emoji}
          </div>
          <div style={{flex:1}}>
            <div style={{display:"flex",gap:7,marginBottom:8,flexWrap:"wrap",alignItems:"center"}}>
              {isOTT
                ? <span style={{fontSize:10,fontWeight:800,color:color,background:`${color}20`,padding:"3px 10px",borderRadius:20,letterSpacing:"0.08em",textTransform:"uppercase"}}>{movie.platform}</span>
                : <span style={{fontSize:10,fontWeight:800,color:color,background:`${color}20`,padding:"3px 10px",borderRadius:20,letterSpacing:"0.08em",textTransform:"uppercase"}}>{movie.badge}</span>
              }
              <span style={{fontSize:12,color:isDark?"#FFD700":"#B8860B",fontWeight:700}}>⭐ {movie.rating}</span>
            </div>
            <h1 style={{fontSize:20,fontWeight:900,color:T.text,fontFamily:"Georgia,serif",marginBottom:5,letterSpacing:"-0.02em",lineHeight:1.2}}>{movie.title}</h1>
            <p style={{fontSize:12,color:T.textMuted}}>{movie.genreLabel || movie.genre} · {movie.duration}</p>
          </div>
        </div>

        <p style={{fontSize:14,lineHeight:1.75,color:T.textSub,marginBottom:22,paddingBottom:18,borderBottom:`1px solid ${T.border}`}}>{movie.desc}</p>

        {/* All Theaters */}
        {!isOTT && theaters.length > 0 && (
          <div>
            <div style={{fontSize:11,color:T.textMuted,marginBottom:14,letterSpacing:"0.07em",textTransform:"uppercase",fontWeight:700}}>
              🎭 Theaters &amp; Showtimes Near You
            </div>
            {theaters.map((th, ti) => {
              const knownLinks = THEATER_LINKS[th.name] || {};
              const hasKnownSite = !!knownLinks.web;
              const theaterWebUrl = knownLinks.web || th.website || "";
              const mapsUrl = th.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(th.name + " " + (th.address||"movie theater"))}`;
              return (
                <div key={ti} style={{marginBottom:16,background:isDark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.03)",borderRadius:18,border:`1px solid ${T.border}`,boxShadow:isDark?"none":"0 1px 6px rgba(0,0,0,0.05)",overflow:"hidden"}}>
                  {/* Theater header */}
                  <div style={{padding:"14px 16px 10px",borderBottom:`1px solid ${T.border}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                      <div
                        onClick={()=>{ if(hasKnownSite) openTheater(th.name, false); else window.open(mapsUrl,"_blank"); }}
                        style={{fontSize:14,fontWeight:800,color:T.text,cursor:"pointer",textDecoration:"underline",textDecorationColor:`${color}60`,textUnderlineOffset:3}}>
                        {th.name} ↗
                      </div>
                      <div style={{fontSize:11,fontWeight:700,color:color,background:`${color}18`,padding:"3px 9px",borderRadius:10}}>{th.distance}</div>
                    </div>
                    {th.address && <div style={{fontSize:11,color:T.textMuted,marginBottom:6}}>{th.address}</div>}
                    {/* Quick action buttons */}
                    <div style={{display:"flex",gap:6,marginTop:4}}>
                      <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{textDecoration:"none",fontSize:10,fontWeight:700,color:"#fff",background:"linear-gradient(135deg,#FF6B35,#FF3B5C)",borderRadius:8,padding:"4px 10px"}}>
                        📍 Directions
                      </a>
                      {theaterWebUrl ? (
                        <a href={theaterWebUrl} target="_blank" rel="noopener noreferrer" style={{textDecoration:"none",fontSize:10,fontWeight:700,color:T.text,background:T.bgInput,border:`1px solid ${T.borderStrong}`,borderRadius:8,padding:"4px 10px"}}>
                          🎟️ Tickets
                        </a>
                      ) : (
                        <a href={`https://www.google.com/search?q=${encodeURIComponent(th.name+" movie showtimes")}`} target="_blank" rel="noopener noreferrer" style={{textDecoration:"none",fontSize:10,fontWeight:700,color:T.text,background:T.bgInput,border:`1px solid ${T.borderStrong}`,borderRadius:8,padding:"4px 10px"}}>
                          🎟️ Showtimes
                        </a>
                      )}
                    </div>
                  </div>
                  {/* Showtimes */}
                  <div style={{padding:"12px 16px"}}>
                    <div style={{fontSize:10,color:T.textFaint,marginBottom:8,fontWeight:600}}>ESTIMATED SHOWTIMES · Tap to book</div>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                      {(th.showTimes||GENERIC_SHOWTIMES).map((t, si) => (
                        <div key={si}
                          onClick={()=>setBooking({theater:th.name, time:t, mapsUrl, website:theaterWebUrl})}
                          style={{
                            background:isDark?`${color}15`:`${color}22`,
                            border:`1px solid ${color}80`,
                            borderRadius:10, padding:"8px 13px", cursor:"pointer",
                            transition:"all 0.15s ease",
                          }}>
                          <div style={{fontSize:13,fontWeight:700,color:isDark?"#ffffff":"#111111"}}>{t}</div>
                          <div style={{fontSize:9,color:isDark?`${color}99`:color,marginTop:1,fontWeight:600}}>TAP TO BOOK</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {isOTT && (() => {
          const watchUrl = movie.watchLink || platformSearchUrl(movie.platform, movie.title);
          const appLinks = OTT_APP_LINKS[movie.platform];
          return (
            <div>
              <div onClick={()=>openOTTApp(movie.platform, movie.title, watchUrl)}
                style={{width:"100%",padding:"16px",background:`linear-gradient(135deg,${color},${color}cc)`,borderRadius:16,color:"#fff",fontSize:15,fontWeight:800,textAlign:"center",cursor:"pointer",marginBottom:appLinks?8:0}}>
                ▶ Watch on {movie.platform}
              </div>
              {appLinks && (
                <a href={watchUrl} target="_blank" rel="noopener noreferrer" style={{display:"block",textDecoration:"none"}}>
                  <div style={{width:"100%",padding:"12px",background:isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.04)",border:`1px solid ${T.border}`,borderRadius:12,color:T.textMuted,fontSize:12,fontWeight:600,textAlign:"center",cursor:"pointer"}}>
                    Open in browser instead
                  </div>
                </a>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}


// ─── MAIN APP ────────────────────────────────────────

export default function PulseApp() {
  const [mainTab, setMainTab] = useState(null);
  const [movieTab, setMovieTab] = useState(null);

  // ─── FAMILY WORKSPACE AUTH STATE ────────────────────────────────────────
  const [fwUser, setFwUser]               = useState(() => { try { return JSON.parse(localStorage.getItem("pulse_fw_user")||"null"); } catch { return null; } });
  const [fwToken, setFwToken]             = useState(() => localStorage.getItem("pulse_fw_token")||null);
  const [fwRole, setFwRole]               = useState(() => localStorage.getItem("pulse_fw_role")||null); // "head" | "member"
  const [fwWorkspace, setFwWorkspace]     = useState(() => { try { return JSON.parse(localStorage.getItem("pulse_fw_workspace")||"null"); } catch { return null; } }); // { folderId, fileIds:{grocery,todos,appointments,members} }
  const [fwMembers, setFwMembers]         = useState(() => { try { const c = localStorage.getItem('pulse_fw_members_cache'); return c ? JSON.parse(c) : []; } catch { return []; } });  // [{ name, email, role, joinedAt }]
  const [fwScreen, setFwScreen]           = useState("home"); // "home" | "setup" | "invite"
  const [fwLoading, setFwLoading]         = useState(false);
  const [fwError, setFwError]             = useState("");
  const [fwInviteEmail, setFwInviteEmail] = useState("");
  const [fwInviteStatus, setFwInviteStatus] = useState(""); // "" | "sending" | "sent" | "error"
  const [fwShowInvite, setFwShowInvite] = useState(false);
  const [fwInviteName, setFwInviteName] = useState("");
  const [fwInviteError, setFwInviteError] = useState("");
  const [fwInviteGender, setFwInviteGender] = useState("");

  // ─── ONBOARDING STATE ────────────────────────────────────────
  // Steps: "splash" → "role" → "add_members" → done (null)
  const [onboardingStep, setOnboardingStep] = useState(() => {
    // If already signed in with a role, skip onboarding
    const user = localStorage.getItem("pulse_fw_user");
    const role = localStorage.getItem("pulse_fw_role");
    if (user && user !== "null" && role) {
      // Also check if gender is set in the members cache
      try {
        const userObj = JSON.parse(user);
        const membersCache = localStorage.getItem("pulse_fw_members_cache");
        if (membersCache) {
          const members = JSON.parse(membersCache);
          const me = members.find(m => m.email === userObj.email);
          if (me && !me.gender) return "gender";
        }
      } catch {}
      return null;
    }
    if (user && user !== "null" && !role) return "role";
    return "splash";
  });
  const [onboardingAddEmails, setOnboardingAddEmails] = useState([""]);
  const [onboardingAddNames, setOnboardingAddNames] = useState([""]);
  const [onboardingAddGenders, setOnboardingAddGenders] = useState([""]);
  const [onboardingInviting, setOnboardingInviting] = useState(false);
  const [onboardingMemberError, setOnboardingMemberError] = useState("");
  const [onboardingGender, setOnboardingGender] = useState(() => {
    // Pre-load saved gender from members cache so the gender step shows the correct selection
    try {
      const user = localStorage.getItem("pulse_fw_user");
      if (user && user !== "null") {
        const userObj = JSON.parse(user);
        const membersCache = localStorage.getItem("pulse_fw_members_cache");
        if (membersCache) {
          const members = JSON.parse(membersCache);
          const me = members.find(m => m.email === userObj.email);
          if (me?.gender) return me.gender;
        }
      }
    } catch {}
    return "";
  });
  const [editingProfile, setEditingProfile] = useState(false);
  const [editName, setEditName] = useState("");
  const [reminderWindow, setReminderWindow] = useState(() => localStorage.getItem("pulse_reminder_window") || "1 Day");
  const [notifSound, setNotifSound] = useState(() => localStorage.getItem("pulse_notif_sound") || "Heartbeat Pulse");
  const [theaterCountry, setTheaterCountry] = useState("american");
  const [ottCategory, setOttCategory] = useState("global");
  // Nearby theaters (live via geolocation)
  const [nearbyTheaters, setNearbyTheaters]       = useState([]);
  const nearbyTheatersRef = useRef([]);
  const [theaterGeoLoading, setTheaterGeoLoading] = useState(false);
  const [theaterGeoError, setTheaterGeoError]     = useState(null);
  const [theaterCity, setTheaterCity]             = useState(null);
  const [theaterCoords, setTheaterCoords]         = useState(null);
  // ─── TMD ────────────────────────────────────────b live data
  const [tmdbTheater, setTmdbTheater]       = useState({});   // { american: [...], indian: [...], ... }
  const [tmdbOTT, setTmdbOTT]               = useState({});   // { global: [...], indian: [...] }
  const [tmdbLoading, setTmdbLoading]       = useState({});   // { american: true, ... }
  const [tmdbError, setTmdbError]           = useState({});
  const TMDB_NO_KEY = TMDB_API_KEY === "YOUR_TMDB_API_KEY";

  async function fetchTheaterMovies(country) {
    if (tmdbTheater[country]) return;
    setTmdbLoading(p => ({...p, [country]:true}));
    try {
      const LANG_MAP = {
        american: null,
        british: ["en"],
        french: ["fr"],
        indian: ["hi","te","ta","ml","kn"],
        korean: ["ko"], japanese: ["ja"],
      };
      const langs  = LANG_MAP[country];
      const region = COUNTRY_REGION[country] || "US";

      // Try direct first, fall back to CORS proxy
      const tryFetch = async (url) => {
        try {
          const r = await fetch(url);
          if (r.ok) return r.json();
        } catch {}
        const r2 = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`);
        if (r2.ok) return r2.json();
        throw new Error("failed");
      };

      // Only American uses now_playing; all others use discover with language + region filter
      const useNowPlaying = country === "american";
      // For discover, filter to movies released in the last 6 months to keep results current
      const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      let results = [];
      if (useNowPlaying) {
        // American — now_playing in US region
        const data = await tryFetch(`${TMDB_BASE}/movie/now_playing?api_key=${TMDB_API_KEY}&region=US&language=en-US&page=1`);
        results = data.results || [];
      } else if (country === "british") {
        // British — English language movies from GB region, sorted by popularity
        const data = await tryFetch(`${TMDB_BASE}/discover/movie?api_key=${TMDB_API_KEY}&region=GB&with_original_language=en&sort_by=popularity.desc&primary_release_date.gte=${sixMonthsAgo}&with_release_type=3|2&page=1`);
        const gbResults = (data.results || []);
        // Also fetch now_playing in GB and merge for broader coverage
        let nowPlaying = [];
        try {
          const np = await tryFetch(`${TMDB_BASE}/movie/now_playing?api_key=${TMDB_API_KEY}&region=GB&language=en-US&page=1`);
          nowPlaying = (np.results || []);
        } catch {}
        // Merge: prioritize GB-specific, then supplement with now_playing
        const seen = new Set();
        for (const m of gbResults) { seen.add(m.id); results.push(m); }
        for (const m of nowPlaying) { if (!seen.has(m.id)) { seen.add(m.id); results.push(m); } }
      } else if (langs.length === 1) {
        // French, Korean, Japanese — single language with region filter
        const data = await tryFetch(`${TMDB_BASE}/discover/movie?api_key=${TMDB_API_KEY}&with_original_language=${langs[0]}&region=${region}&sort_by=popularity.desc&primary_release_date.gte=${sixMonthsAgo}&page=1`);
        results = data.results || [];
      } else if (langs.length === 1) {
        // Korean, Japanese — single language
        const data = await tryFetch(`${TMDB_BASE}/discover/movie?api_key=${TMDB_API_KEY}&with_original_language=${langs[0]}&sort_by=popularity.desc&primary_release_date.gte=${sixMonthsAgo}&page=1`);
        results = data.results || [];
      } else {
        // Indian — multiple languages
        const fetches = await Promise.all(langs.map(lang =>
          tryFetch(`${TMDB_BASE}/discover/movie?api_key=${TMDB_API_KEY}&with_original_language=${lang}&sort_by=popularity.desc&primary_release_date.gte=${sixMonthsAgo}&page=1`)
            .then(d => d.results || []).catch(() => [])
        ));
        const seen = new Set();
        for (const batch of fetches)
          for (const m of batch)
            if (!seen.has(m.id)) { seen.add(m.id); results.push(m); }
        results.sort((a,b) => (b.popularity||0) - (a.popularity||0));
      }

      const top = results.slice(0, 12);
      const detailed = await Promise.all(top.map(async m => {
        try {
          const d = await tryFetch(`${TMDB_BASE}/movie/${m.id}?api_key=${TMDB_API_KEY}&language=en-US`);
          return { ...m, runtime: d.runtime, genres: d.genres };
        } catch { return m; }
      }));
      // Use appropriate badge: NOW PLAYING for now_playing endpoint, IN THEATERS for discover
      const badge = useNowPlaying ? "NOW PLAYING" : "IN THEATERS";
      setTmdbTheater(p => ({...p, [country]: detailed.map(m => tmdbMovieToCard(m, badge, nearbyTheatersRef.current))}));
    } catch(e) {
      setTmdbError(p => ({...p, [country]: true}));
    }
    setTmdbLoading(p => ({...p, [country]:false}));
  }

  async function fetchOTTMovies(category) {
    if (tmdbOTT[category]?.length > 0) return;
    setTmdbLoading(p => ({...p, [`ott_${category}`]:true}));
    try {
      // ─── Known provider IDs on TMDb (JustWatch) ────────────────────────────────────────
      // ─── US ────────────────────────────────────────: Netflix=8, Prime Video=9, Disney+=337, Max=1899, Hulu=15, Apple TV+=350, Peacock=386
      // ─── IN ────────────────────────────────────────: Netflix=8, Prime Video=119, JioHotstar=2336, Disney+=122, SonyLIV=237, ZEE5=232, JioCinema=220
      const PROVIDER_MAP = {
        // Global
        8:"Netflix", 9:"Prime Video", 337:"Disney+", 1899:"Max", 15:"Hulu",
        350:"Apple TV+", 386:"Peacock", 531:"Paramount+", 283:"Crunchyroll",
        // India-specific
        119:"Prime Video",   // Amazon Prime Video IN (different ID from US)
        2336:"JioHotstar",   // JioHotstar IN (merged Hotstar + JioCinema)
        122:"Disney+",       // Disney+ IN
        237:"SonyLIV",
        232:"ZEE5",
        220:"JioCinema",
      };
      const locale = category === "indian" ? "IN" : "US";

      // ─── Indian OTT ────────────────────────────────────────
      if (category === "indian") {
        // ─── TMD ────────────────────────────────────────b provider IDs for IN locale (verified against JustWatch IN region)
        const IN_PLATFORMS = [
          { id: 8,    name: "Netflix"     },
          { id: 119,  name: "Prime Video" },  // IN-specific Prime Video ID
          { id: 2336, name: "JioHotstar" },   // JioHotstar (merged Hotstar + JioCinema)
          { id: 237,  name: "SonyLIV"    },
          { id: 232,  name: "ZEE5"       },
          { id: 122,  name: "Disney+"    },   // Disney+ IN
        ];
        // Indian languages to filter by — only show movies originally made in these languages
        const INDIAN_LANGS = ["hi","te","ta","ml","kn","bn","mr","pa","gu","or","as","ur"];
        // Fetch 3 pages per platform per language in parallel — gives a rich list of Indian movies only
        // Date filters: last 12 months for new releases, last 3 years for popular catalog
        const _now = new Date();
        const _recentDate = new Date(_now); _recentDate.setMonth(_now.getMonth() - 12);
        const _recentDateStr = _recentDate.toISOString().slice(0, 10);
        const _olderDate = new Date(_now); _olderDate.setFullYear(_now.getFullYear() - 3);
        const _olderDateStr = _olderDate.toISOString().slice(0, 10);
        const perPlatform = await Promise.all(IN_PLATFORMS.map(async (pl) => {
          try {
            // Fetch RECENT releases (last 12 months) sorted by release date DESC — catches new movies first
            const recentResults = await Promise.all(INDIAN_LANGS.slice(0, 5).map(lang =>
              Promise.all([1, 2].map(page =>
                fetch(
                  `${TMDB_BASE}/discover/movie?api_key=${TMDB_API_KEY}` +
                  `&with_watch_providers=${pl.id}&watch_region=IN` +
                  `&with_original_language=${lang}` +
                  `&primary_release_date.gte=${_recentDateStr}` +
                  `&sort_by=primary_release_date.desc&page=${page}`
                ).then(r => r.ok ? r.json() : {}).then(d => d.results || [])
              )).then(pages => pages.flat())
            ));
            // Also fetch popular movies from last 3 years — fills in well-known titles
            const popularResults = await Promise.all(INDIAN_LANGS.slice(0, 5).map(lang =>
              Promise.all([1, 2].map(page =>
                fetch(
                  `${TMDB_BASE}/discover/movie?api_key=${TMDB_API_KEY}` +
                  `&with_watch_providers=${pl.id}&watch_region=IN` +
                  `&with_original_language=${lang}` +
                  `&primary_release_date.gte=${_olderDateStr}` +
                  `&sort_by=popularity.desc&page=${page}`
                ).then(r => r.ok ? r.json() : {}).then(d => d.results || [])
              )).then(pages => pages.flat())
            ));
            // Merge: recent releases FIRST, then popular — deduplicate by id
            const _seen = new Set();
            const allResults = [...recentResults.flat(), ...popularResults.flat()].filter(m => {
              if (_seen.has(m.id)) return false;
              _seen.add(m.id);
              return true;
            });
            // Keep recent releases at top, sort the rest by popularity
            const recentIds = new Set(recentResults.flat().map(m => m.id));
            allResults.sort((a, b) => {
              const aRecent = recentIds.has(a.id), bRecent = recentIds.has(b.id);
              if (aRecent && !bRecent) return -1;
              if (!aRecent && bRecent) return 1;
              if (aRecent && bRecent) return new Date(b.release_date||0) - new Date(a.release_date||0);
              return (b.popularity || 0) - (a.popularity || 0);
            });
            return allResults.map(m => ({
              m,
              pInfo: {
                platform: pl.name,
                watchLink: `https://www.themoviedb.org/movie/${m.id}/watch?locale=IN`,
              },
            }));
          } catch { return []; }
        }));

        // Interleave results: round-robin across platforms so each gets fair representation
        const interleaved = [];
        const seen = new Set();
        const maxPerPlatform = 10;  // up to 10 per platform in the final list
        for (let i = 0; i < maxPerPlatform; i++) {
          for (const batch of perPlatform) {
            if (batch[i] && !seen.has(batch[i].m.id)) {
              seen.add(batch[i].m.id);
              interleaved.push(batch[i]);
            }
          }
        }

        const cards = interleaved.slice(0, 60).map(({ m, pInfo }, i) => {
          const platform = pInfo.platform;
          const genres   = (m.genre_ids||[]).map(id => GENRE_MAP[id]).filter(Boolean);
          const color    = PLATFORM_COLORS[platform] || "#888";
          const released = m.release_date ? new Date(m.release_date).toLocaleDateString("en-US",{month:"short",day:"numeric"}) : "";
          return {
            id: m.id, title: m.title || m.name,
            platform, genre: genres.slice(0,2).join(" · ") || "Drama",
            rating: m.vote_average?.toFixed(1) || "N/A",
            duration: "", badge: m.release_date && (new Date() - new Date(m.release_date)) < 60*24*60*60*1000 ? "🆕 NEW" : i < 6 ? "TOP 10" : "NEW",
            color, emoji: genreEmoji(genres), released,
            desc: m.overview || "",
            poster: m.poster_path ? `${TMDB_IMG}${m.poster_path}` : null,
            watchLink: pInfo.watchLink,
            hasRealProvider: true,
          };
        });
        setTmdbOTT(p => ({...p, [category]: cards}));
        setTmdbLoading(p => ({...p, [`ott_${category}`]:false}));
        return;
      }

      // ─── Global OTT ────────────────────────────────────────
      // Fetch pages 1-3 of weekly trending movies in parallel
      const trendingPages = await Promise.all([1, 2, 3].map(page =>
        fetch(`${TMDB_BASE}/trending/movie/week?api_key=${TMDB_API_KEY}&page=${page}`)
          .then(r => r.ok ? r.json() : {}).then(d => d.results || [])
      ));
      const results = trendingPages.flat();

      // Fetch watch providers for all results in parallel, keep only confirmed
      const top = results.slice(0, 60);
      const providerResults = await Promise.all(top.map(m =>
        fetch(`${TMDB_BASE}/movie/${m.id}/watch/providers?api_key=${TMDB_API_KEY}`)
          .then(r => r.ok ? r.json() : {})
          .then(d => {
            const loc = (d.results || {})[locale] || {};
            const flatrate = loc.flatrate || [];
            const provider = flatrate.find(p => PROVIDER_MAP[p.provider_id]);
            return {
              platform: provider ? PROVIDER_MAP[provider.provider_id] : null,
              watchLink: loc.link || null,
            };
          })
          .catch(() => ({ platform: null, watchLink: null }))
      ));

      // Only include movies that have a CONFIRMED streaming platform — no guessing
      const confirmed = top
        .map((m, i) => ({ m, pInfo: providerResults[i] }))
        .filter(({ pInfo }) => pInfo.platform !== null);

      const cards = confirmed.slice(0, 40).map(({ m, pInfo }, i) => {
        const platform = pInfo.platform;
        const genres   = (m.genre_ids||[]).map(id => GENRE_MAP[id]).filter(Boolean);
        const color    = PLATFORM_COLORS[platform] || "#888";
        const released = m.release_date ? new Date(m.release_date).toLocaleDateString("en-US",{month:"short",day:"numeric"}) : "";
        const watchLink = pInfo.watchLink || platformSearchUrl(platform, m.title || m.name);
        return {
          id: m.id, title: m.title || m.name,
          platform, genre: genres.slice(0,2).join(" · ") || "Drama",
          rating: m.vote_average?.toFixed(1) || "N/A",
          duration: "", badge: i < 10 ? "TOP 10" : "NEW",
          color, emoji: genreEmoji(genres), released,
          desc: m.overview || "",
          poster: m.poster_path ? `${TMDB_IMG}${m.poster_path}` : null,
          watchLink,
          hasRealProvider: true,
        };
      });
      setTmdbOTT(p => ({...p, [category]: cards}));
    } catch(e) {
      setTmdbError(p => ({...p, [`ott_${category}`]: true}));
    }
    setTmdbLoading(p => ({...p, [`ott_${category}`]:false}));
  }

  // ─── NEARBY THEATERS (geolocation + Overpass) ────────────────────────────────────────
  async function fetchNearbyTheaters(lat, lng) {
    setTheaterGeoLoading(true);
    setTheaterGeoError(null);
    // 50 miles ≈ 80467 metres
    const radius = 80467;
    const query = `[out:json][timeout:30];(
      node["amenity"="cinema"](around:${radius},${lat},${lng});
      way["amenity"="cinema"](around:${radius},${lat},${lng});
      node["amenity"="theatre"](around:${radius},${lat},${lng});
      way["amenity"="theatre"](around:${radius},${lat},${lng});
    );out center 20;`;
    try {
      const res = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST", mode: "cors",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "data=" + encodeURIComponent(query),
      });
      const data = await res.json();
      let elements = (data.elements || []).map(el => ({
        ...el,
        lat: el.lat ?? el.center?.lat,
        lon: el.lon ?? el.center?.lon,
      })).filter(el => el.lat && el.lon);
      if (elements.length === 0) {
        // Widen to 100 miles if nothing found
        const wide = `[out:json][timeout:30];(node["amenity"="cinema"](around:160934,${lat},${lng});way["amenity"="cinema"](around:160934,${lat},${lng}););out center 20;`;
        const r2 = await fetch("https://overpass-api.de/api/interpreter", {
          method: "POST", mode: "cors",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: "data=" + encodeURIComponent(wide),
        });
        const d2 = await r2.json();
        elements = (d2.elements || []).map(el => ({
          ...el,
          lat: el.lat ?? el.center?.lat,
          lon: el.lon ?? el.center?.lon,
        })).filter(el => el.lat && el.lon);
      }
      if (elements.length === 0) {
        setTheaterGeoError("No theaters found within 50 miles.");
        setNearbyTheaters(FALLBACK_THEATERS);
        nearbyTheatersRef.current = FALLBACK_THEATERS;
        setTheaterGeoLoading(false);
        return;
      }
      // Sort by distance and take top 15
      const parsed = elements.map(el => {
        const t = el.tags || {};
        const dlat = (el.lat - lat) * 111;
        const dlng = (el.lon - lng) * 111 * Math.cos(lat * Math.PI / 180);
        const distMi = Math.sqrt(dlat*dlat + dlng*dlng) * 0.621;
        const address = [t["addr:housenumber"], t["addr:street"], t["addr:city"], t["addr:state"]].filter(Boolean).join(" ") || "";
        const name = t.name || t["brand"] || "Movie Theater";
        const website = t.website || t["contact:website"] || "";
        const phone   = t.phone || t["contact:phone"] || "";
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + " " + address)}`;
        return {
          name,
          address,
          distance: distMi < 10 ? distMi.toFixed(1) + " mi" : Math.round(distMi) + " mi",
          distanceMi: distMi,
          website,
          phone,
          mapsUrl,
          lat: el.lat,
          lng: el.lon,
          showTimes: GENERIC_SHOWTIMES,
        };
      });
      parsed.sort((a,b) => a.distanceMi - b.distanceMi);
      const theaters = parsed.slice(0, 15);
      setNearbyTheaters(theaters);
      nearbyTheatersRef.current = theaters;
      // Invalidate cached TMDb results so they get re-fetched with new theaters
      setTmdbTheater({});
    } catch(e) {
      setTheaterGeoError("Could not fetch nearby theaters.");
      setNearbyTheaters(FALLBACK_THEATERS);
      nearbyTheatersRef.current = FALLBACK_THEATERS;
    }
    setTheaterGeoLoading(false);
  }

  // Trigger geolocation when user opens Theater tab
  // Use a ref to avoid stale closure issues with async GPS callback
  const fetchNearbyTheatersRef = useRef(fetchNearbyTheaters);
  useEffect(() => { fetchNearbyTheatersRef.current = fetchNearbyTheaters; });

  useEffect(() => {
    if (mainTab === "movies" && movieTab === "theater") {
      // Try GPS first, fall back to Canton, MI
      setTheaterGeoLoading(true);
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setTheaterCoords(coords);
            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}&zoom=10`)
              .then(r => r.json())
              .then(d => {
                const city = d.address?.city || d.address?.town || d.address?.village || d.address?.county || "";
                const state = d.address?.state ? `, ${d.address.state.replace(/^(.{2}).*/, "$1").toUpperCase()}` : (d.address?.state_code ? `, ${d.address.state_code}` : "");
                setTheaterCity(city ? `${city}${state}` : "Your Location");
              })
              .catch(() => setTheaterCity("Your Location"));
            fetchNearbyTheatersRef.current(coords.lat, coords.lng);
          },
          () => {
            const def = { lat: 42.3098, lng: -83.4827 };
            setTheaterCoords(def);
            setTheaterCity("Canton, MI");
            fetchNearbyTheatersRef.current(def.lat, def.lng);
          },
          { timeout: 5000, enableHighAccuracy: false, maximumAge: 60000 }
        );
      } else {
        const def = { lat: 42.3098, lng: -83.4827 };
        setTheaterCoords(def);
        setTheaterCity("Canton, MI");
        fetchNearbyTheatersRef.current(def.lat, def.lng);
      }
    }
  }, [mainTab, movieTab]);

  useEffect(() => {
    if (mainTab === "movies" && movieTab === "theater") fetchTheaterMovies(theaterCountry);
  }, [mainTab, movieTab, theaterCountry]);

  useEffect(() => {
    if (mainTab === "movies" && movieTab === "ott") fetchOTTMovies(ottCategory);
  }, [mainTab, movieTab, ottCategory]);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [isOTTMovie, setIsOTTMovie] = useState(false);
  const [time, setTime] = useState(new Date());
  const [themeOverride, setThemeOverride] = useState(null);
  const [homeWeather, setHomeWeather] = useState(null);
  const [hydWeather, setHydWeather]   = useState(null);
  const [secondCountry, setSecondCountry] = useState(() => {
    const saved = localStorage.getItem("pulse_second_country");
    return SECOND_COUNTRY_OPTIONS.find(c => c.key === saved) || SECOND_COUNTRY_OPTIONS[0];
  });
  const [restaurantCuisine, setRestaurantCuisine] = useState("american");
  const [restaurants, setRestaurants] = useState([]);
  const [restaurantLoading, setRestaurantLoading] = useState(false);
  const [restaurantError, setRestaurantError] = useState(null);
  const [cityInput, setCityInput] = useState("");
  const [searchedCity, setSearchedCity] = useState(null);

  useEffect(() => { const t = setInterval(()=>setTime(new Date()),1000); return ()=>clearInterval(t); }, []);

  // Fetch weather via Open-Meteo (free, no API key, CORS-friendly)
  // Canton, MI: 42.3087, -83.4827 | Second country: dynamic
  useEffect(() => {
    async function fetchWeather() {
      try {
        const [cantonRes, secRes] = await Promise.all([
          fetch("https://api.open-meteo.com/v1/forecast?latitude=42.3087&longitude=-83.4827&current=temperature_2m,weathercode&temperature_unit=celsius"),
          fetch(`https://api.open-meteo.com/v1/forecast?latitude=${secondCountry.lat}&longitude=${secondCountry.lng}&current=temperature_2m,weathercode&temperature_unit=celsius`)
        ]);
        const [cantonData, secData] = await Promise.all([cantonRes.json(), secRes.json()]);
        if (cantonData.current?.temperature_2m != null)
          setHomeWeather({ temperature: Math.round(cantonData.current.temperature_2m), weathercode: cantonData.current.weathercode });
        if (secData.current?.temperature_2m != null)
          setHydWeather({ temperature: Math.round(secData.current.temperature_2m), weathercode: secData.current.weathercode });
      } catch(e) {}
    }
    fetchWeather();
    // Refresh every 15 minutes
    const interval = setInterval(fetchWeather, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [secondCountry]);

  const hour = time.getHours();
  const autoIsDark = hour < 6 || hour >= 20;
  const isDark = themeOverride === null ? autoIsDark : themeOverride === "dark";

  const T = isDark ? {
    bg:          "#080A0E",
    bgCard:      "rgba(255,255,255,0.04)",
    bgModal:     "#080A0E",
    bgNav:       "rgba(8,10,14,0.98)",
    bgInput:     "rgba(255,255,255,0.07)",
    bgActive:    "#ffffff",
    border:      "rgba(255,255,255,0.07)",
    borderMid:   "rgba(255,255,255,0.10)",
    borderStrong:"rgba(255,255,255,0.12)",
    text:        "#ffffff",
    textSub:     "rgba(255,255,255,0.65)",
    textMuted:   "rgba(255,255,255,0.4)",
    textFaint:   "rgba(255,255,255,0.28)",
    textActive:  "#080A0E",
    shell:       "#1c1c1e",
    skeleton:    "rgba(255,255,255,0.08)",
    phoneShad:   "0 0 0 1px #2a2a2a,0 40px 80px rgba(0,0,0,0.9),inset 0 1px 0 rgba(255,255,255,0.05)",
    themeBadge:  "🌙 Night",
  } : {
    bg:          "#F0F2F5",
    bgCard:      "#FFFFFF",
    bgModal:     "#F0F2F5",
    bgNav:       "rgba(240,242,245,0.98)",
    bgInput:     "rgba(0,0,0,0.06)",
    bgActive:    "#111111",
    border:      "rgba(0,0,0,0.08)",
    borderMid:   "rgba(0,0,0,0.11)",
    borderStrong:"rgba(0,0,0,0.14)",
    text:        "#000000",
    textSub:     "#111111",
    textMuted:   "#333333",
    textFaint:   "#555555",
    textActive:  "#ffffff",
    shell:       "#c8c8cc",
    skeleton:    "rgba(0,0,0,0.07)",
    phoneShad:   "0 0 0 1px #c0c0c5,0 40px 80px rgba(0,0,0,0.2),inset 0 1px 0 rgba(255,255,255,0.9)",
    themeBadge:  "☀️ Day",
  };

  function goHome() {
    setMainTab(null);
    setMovieTab(null);
    setSelectedMovie(null);
  }

  // ─── ADD / REMOVE FAMILY MEMBERS (Drive-backed) ────────────────────────────────────────
  async function addFamilyMember() {
    const name = newMemberInput.trim();
    if (!name) return;
    setNewMemberInput("");
    setShowAddMember(false);
    if (fwWorkspace?.fileIds?.members && fwToken) {
      const current = await fwReadFile(fwWorkspace.fileIds.members, fwToken);
      const alreadyIn = current.some(m => m.name === name);
      if (!alreadyIn) {
        const updated = [...current, { name, email: "", role: "member", joinedAt: Date.now() }];
        await fwWriteFile(fwWorkspace.fileIds.members, updated, fwToken);
        setFwMembers(updated);
      }
    } else {
      // Offline fallback: add to local state only
      setFwMembers(prev => {
        if (prev.some(m => m.name === name)) return prev;
        return [...prev, { name, email: "", role: "member", joinedAt: Date.now() }];
      });
    }
  }

  async function removeFamilyMember(name) {
    if (fwWorkspace?.fileIds?.members && fwToken) {
      const current = await fwReadFile(fwWorkspace.fileIds.members, fwToken);
      const updated = current.filter(m => m.name !== name);
      await fwWriteFile(fwWorkspace.fileIds.members, updated, fwToken);
      setFwMembers(updated);
    } else {
      setFwMembers(prev => prev.filter(m => m.name !== name));
    }
  }

  const [userCity, setUserCity] = useState(null);
  const [userCoords, setUserCoords] = useState(null);

  // ─── GROCERY STATE ────────────────────────────────────────
  const [groceryItems, setGroceryItems] = useState(() => { try { return JSON.parse(localStorage.getItem("pulse_grocery_items") || "[]"); } catch { return []; } });
  const [groceryInput, setGroceryInput] = useState("");
  const [groceryLoading, setGroceryLoading] = useState(false);
  const [groceryStore, setGroceryStore] = useState("all");
  const [groceryStores, setGroceryStores] = useState(() => { try { const s = localStorage.getItem("pulse_grocery_stores"); return s ? JSON.parse(s) : GROCERY_STORES_DEFAULT; } catch { return GROCERY_STORES_DEFAULT; } });
  const [showAddStore, setShowAddStore]   = useState(false);
  const [newStoreInput, setNewStoreInput] = useState("");
  // ─── GROCERY Google Drive-backed functions ────────────────────────────────────────

  async function addGroceryStore() {
    const name = newStoreInput.trim();
    if (!name) return;
    const color = STORE_COLORS[Math.floor(Math.random() * STORE_COLORS.length)];
    const newStore = { id: name, label: name, emoji: "📌", color };
    const updated = [...groceryStores, newStore];
    setGroceryStores(updated);
    setNewStoreInput("");
    setShowAddStore(false);
    // Persist stores as part of Grocery.json metadata if workspace is available
    if (fwWorkspace?.fileIds?.grocery && fwToken) {
      const current = await fwReadFile(fwWorkspace.fileIds.grocery, fwToken);
      const withMeta = Array.isArray(current) ? current : [];
      // Store custom stores in a special metadata entry
      const filtered = withMeta.filter(i => i.__type !== "stores_meta");
      await fwWriteFile(fwWorkspace.fileIds.grocery, [...filtered, { __type:"stores_meta", stores: updated }], fwToken);
    }
  }

  async function removeGroceryStore(id) {
    const updated = groceryStores.filter(s => s.id !== id);
    setGroceryStores(updated);
    if (groceryStore === id) setGroceryStore("all");
    if (fwWorkspace?.fileIds?.grocery && fwToken) {
      const current = await fwReadFile(fwWorkspace.fileIds.grocery, fwToken);
      const filtered = (Array.isArray(current) ? current : []).filter(i => i.__type !== "stores_meta");
      await fwWriteFile(fwWorkspace.fileIds.grocery, [...filtered, { __type:"stores_meta", stores: updated }], fwToken);
    }
  }

  useEffect(() => {
    if (mainTab === "grocery") loadGrocery();
  }, [mainTab]);
  // Poll grocery every 10s when tab is active so family members' additions appear automatically
  useEffect(() => {
    if (mainTab !== "grocery") return;
    const folderId = fwWorkspace?.folderId;
    if (!folderId) return; // no workspace yet — don't poll
    const key = folderId.replace(/[.#$[\]]/g, ",");
    const fbUrl = `${FAMILY_BASE}/${key}/grocery`;
    // Load immediately when tab opens
    loadGrocery(fbUrl);
    const groceryPollId = setInterval(() => { loadGrocery(fbUrl); }, 10000);
    return () => clearInterval(groceryPollId);
  }, [mainTab, fwWorkspace?.folderId]);

  async function loadGrocery(fbUrl) {
    setGroceryLoading(true);
    // Load from Firebase (real-time shared) — fall back to localStorage cache
    const cachedItems = localStorage.getItem("pulse_grocery_items");
    const cachedStores = localStorage.getItem("pulse_grocery_stores");
    if (cachedItems) { try { setGroceryItems(JSON.parse(cachedItems)); } catch(e) {} }
    if (cachedStores) { try { setGroceryStores(JSON.parse(cachedStores)); } catch(e) {} }
    try {
      const url = fbUrl || GROCERY_FB;
      if (url && !url.includes("undefined")) {
        const res = await fetch(`${url}.json`);
        const data = await res.json();
        if (data && typeof data === "object") {
          const items = Object.entries(data)
            .map(([id, val]) => ({ fbId: id, ...val }))
            .sort((a,b) => (b.createdAt||0) - (a.createdAt||0));
          setGroceryItems(items);
          localStorage.setItem("pulse_grocery_items", JSON.stringify(items));
        }
        // If data === null, do NOT clear — keep existing items (could be a network blip)
      }
    } catch(e) { /* keep cached data on error */ }
    setGroceryLoading(false);
  }

  async function addGroceryItem() {
    const text = groceryInput.trim();
    if (!text) return;
    setGroceryInput("");
    const addedBy = fwUser?.name || "Family";
    const item = { id: "g_" + Date.now(), text, done: false, store: groceryStore === "all" ? "" : groceryStore, createdAt: Date.now(), addedBy, assignedTo: "" };
    setGroceryItems(prev => { const updated = [item, ...prev]; localStorage.setItem("pulse_grocery_items", JSON.stringify(updated)); return updated; });
    const folderId = fwWorkspace?.folderId;
    if (folderId) {
      const key = folderId.replace(/[.#$[\]]/g, ",");
      const fbUrl = `${FAMILY_BASE}/${key}/grocery`;
      try {
        const res = await fetch(`${fbUrl}.json`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item)
        });
        const data = await res.json();
        if (data?.name) {
          setGroceryItems(prev => {
            const updated = prev.map(i => i.id === item.id ? { ...i, fbId: data.name } : i);
            localStorage.setItem("pulse_grocery_items", JSON.stringify(updated));
            return updated;
          });
        }
      } catch(e) {}
    }
  }

   async function toggleGroceryItem(id, done) {
    setGroceryItems(prev => { const updated = prev.map(i => i.id === id ? { ...i, done: !done } : i); localStorage.setItem("pulse_grocery_items", JSON.stringify(updated)); return updated; });
    const folderId = fwWorkspace?.folderId;
    if (folderId) {
      const key = folderId.replace(/[.#$[\]]/g, ",");
      const fbBase = `${FAMILY_BASE}/${key}/grocery`;
      const item = groceryItems.find(i => i.id === id);
      const fbId = item?.fbId;
      if (fbId) {
        try { await fetch(`${fbBase}/${fbId}.json`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ done: !done }) }); } catch(e) {}
      }
    }
  }
  async function deleteGroceryItem(id) {
    const item = groceryItems.find(i => i.id === id);
    const fbId = item?.fbId;
    setGroceryItems(prev => { const updated = prev.filter(i => i.id !== id); localStorage.setItem("pulse_grocery_items", JSON.stringify(updated)); return updated; });
    const folderId = fwWorkspace?.folderId;
    if (folderId && fbId) {
      const key = folderId.replace(/[.#$[\]]/g, ",");
      try { await fetch(`${FAMILY_BASE}/${key}/grocery/${fbId}.json`, { method:"DELETE" }); } catch(e) {}
    }
  }

  async function clearDoneItems() {
    const doneItems = groceryItems.filter(i => i.done);
    setGroceryItems(prev => { const updated = prev.filter(i => !i.done); localStorage.setItem("pulse_grocery_items", JSON.stringify(updated)); return updated; });
    const folderId = fwWorkspace?.folderId;
    if (folderId) {
      const key = folderId.replace(/[.#$[\]]/g, ",");
      await Promise.all(doneItems.filter(i => i.fbId).map(i =>
        fetch(`${FAMILY_BASE}/${key}/grocery/${i.fbId}.json`, { method:"DELETE" }).catch(()=>{})
      ));
    }
  }

  // ─── DOCTOR APPOINTMENTS STATE ────────────────────────────────────────
  const [apptItems, setApptItems]       = useState(() => { try { return JSON.parse(localStorage.getItem("pulse_appointments") || "[]"); } catch { return []; } });
  const [apptLoading, setApptLoading]   = useState(false);
  const [showApptForm, setShowApptForm] = useState(false);
  const [apptForm, setApptForm]         = useState({ doctor:"", doctorName:"", address:"", member:"", date:"", time:"", notes:"" });
  const [apptFilterMember, setApptFilterMember] = useState("All");
  // familyMembers: logged-in user + workspace members (deduplicated)
  const familyMembers = (() => {
    const me = fwUser?.name || "Me";
    const others = fwMembers.filter(m => m.email !== fwUser?.email).map(m => m.name || m.email.split("@")[0]);
    return [me, ...others];
  })();
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberInput, setNewMemberInput] = useState("");
  const DOCTOR_TYPES = ["👨‍⚕️ Primary Care","👶 Pediatrician","👩‍⚕️ Gynecologist","🦷 Dentist","👁️ Eye Doctor","🧠 Specialist","💊 Pharmacy","🏥 Hospital","🩺 Other"];

  useEffect(() => {
    if (mainTab === "doctor") loadAppts();
  }, [mainTab]);

  async function loadAppts() {
    setApptLoading(true);
    try {
      if (fwWorkspace?.fileIds?.appointments && fwToken) {
        const items = await fwReadFile(fwWorkspace.fileIds.appointments, fwToken);
        if (Array.isArray(items) && items.length > 0) {
          const sorted = items.sort((a,b) => new Date(a.date+" "+a.time) - new Date(b.date+" "+b.time));
          setApptItems(sorted);
          localStorage.setItem("pulse_appointments", JSON.stringify(sorted));
        }
      }
    } catch(e) { /* keep localStorage data */ }
    setApptLoading(false);
  }

  async function saveAppt() {
    if (!apptForm.doctor || !apptForm.date) return;
    const item = { ...apptForm, id: "a_" + Date.now(), done: false, createdAt: Date.now(), addedBy: fwUser?.name || "Family" };
    setApptItems(prev => { const updated = [...prev, item].sort((a,b) => new Date(a.date+" "+a.time) - new Date(b.date+" "+b.time)); localStorage.setItem("pulse_appointments", JSON.stringify(updated)); return updated; });
    setShowApptForm(false);
    setApptForm({ doctor:"", doctorName:"", address:"", member:"", date:"", time:"", notes:"" });
    if (fwWorkspace?.fileIds?.appointments && fwToken) {
      const current = await fwReadFile(fwWorkspace.fileIds.appointments, fwToken);
      await fwWriteFile(fwWorkspace.fileIds.appointments, [...(Array.isArray(current) ? current : []), item], fwToken);
    }
  }

  async function deleteAppt(id) {
    setApptItems(prev => { const updated = prev.filter(i => i.id !== id); localStorage.setItem("pulse_appointments", JSON.stringify(updated)); return updated; });
    if (fwWorkspace?.fileIds?.appointments && fwToken) {
      const current = await fwReadFile(fwWorkspace.fileIds.appointments, fwToken);
      await fwWriteFile(fwWorkspace.fileIds.appointments, (Array.isArray(current) ? current : []).filter(i => i.id !== id), fwToken);
    }
  }

  async function toggleApptDone(id, done) {
    setApptItems(prev => { const updated = prev.map(i => i.id === id ? { ...i, done: !done } : i); localStorage.setItem("pulse_appointments", JSON.stringify(updated)); return updated; });
    if (fwWorkspace?.fileIds?.appointments && fwToken) {
      const current = await fwReadFile(fwWorkspace.fileIds.appointments, fwToken);
      await fwWriteFile(fwWorkspace.fileIds.appointments, (Array.isArray(current) ? current : []).map(i => i.id === id ? { ...i, done: !done } : i), fwToken);
    }
  }

  // ─── GMAIL APPOINTMENT SYNC ────────────────────────────────────────
  const [apptSyncing, setApptSyncing] = useState(false);
  const [apptSyncMsg, setApptSyncMsg] = useState("");

  function apptDecodeBody(rawBody) {
    try { const b64 = rawBody.replace(/-/g,'+').replace(/_/g,'/'); return decodeURIComponent(escape(atob(b64))); } catch { return ""; }
  }
  function apptExtractText(payload) {
    if (!payload) return "";
    if (payload.mimeType === "text/plain" && payload.body?.data) return apptDecodeBody(payload.body.data);
    if (payload.mimeType === "text/html" && payload.body?.data) { try { return apptDecodeBody(payload.body.data).replace(/<[^>]+>/g," "); } catch { return ""; } }
    for (const part of (payload.parts || [])) { const t = apptExtractText(part); if (t) return t; }
    return "";
  }

  function apptClassifyDoctor(subject, body) {
    const s = (subject + " " + body).toLowerCase();
    if (/pediatric|paediatr|well.?child|child.*check|immunization|vaccination.*child/.test(s)) return "👶 Pediatrician";
    if (/gynecolog|ob.?gyn|prenatal|pap smear|mammogram|women.?s health|obstetric/.test(s)) return "👩‍⚕️ Gynecologist";
    if (/dental|dentist|orthodont|tooth|teeth|oral|root canal|crown|filling|cleaning/.test(s)) return "🦷 Dentist";
    if (/eye|vision|ophthal|optometr|retina|glasses|contact lens|lasik/.test(s)) return "👁️ Eye Doctor";
    if (/pharmacy|prescription|refill|medication|rx|drug/.test(s)) return "💊 Pharmacy";
    if (/hospital|emergency|urgent care|er visit|admission|discharge|surgery|operation/.test(s)) return "🏥 Hospital";
    if (/specialist|cardiolog|dermatolog|neurolog|orthoped|urolog|oncolog|endocrin|gastro|pulmon|allergist|rheumat|psych|therap/.test(s)) return "🧠 Specialist";
    if (/doctor|dr\.|physician|primary care|check.?up|physical|annual.*exam|appointment|medical|clinic|patient|health|lab|blood|test result|referral/.test(s)) return "👨‍⚕️ Primary Care";
    return null;
  }

  function apptExtractFields(subject, body) {
    const clean = body.replace(/\s+/g," ");
    // Doctor name
    let doctorName = "";
    const drMatch = clean.match(/(?:Dr\.?|Doctor)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/);
    if (drMatch) doctorName = "Dr. " + drMatch[1].trim();
    // Date
    let date = "";
    const datePatterns = [
      /(?:appointment|visit|scheduled|date)\s*[:\-]?\s*(\w+ \d{1,2},?\s*\d{4})/i,
      /(?:appointment|visit|scheduled|date)\s*[:\-]?\s*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i,
      /(\d{4}-\d{2}-\d{2})/,
      /(\w+day,?\s+\w+ \d{1,2},?\s*\d{4})/i,
      /(\w+ \d{1,2},?\s*\d{4})/i,
    ];
    for (const p of datePatterns) { const m = clean.match(p); if (m) { const d = new Date(m[1]); if (!isNaN(d)) { date = d.toISOString().split("T")[0]; break; } } }
    // Time
    let time = "";
    const timeMatch = clean.match(/(?:at|time|@)\s*(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)/i) || clean.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
    if (timeMatch) {
      const raw = timeMatch[1].trim().toUpperCase();
      const [hm, ampm] = raw.split(/\s+/);
      const [h, min] = hm.split(":").map(Number);
      if (ampm === "PM" && h < 12) time = `${h+12}:${String(min).padStart(2,"0")}`;
      else if (ampm === "AM" && h === 12) time = `00:${String(min).padStart(2,"0")}`;
      else time = `${String(h).padStart(2,"0")}:${String(min).padStart(2,"0")}`;
    }
    // Address
    let address = "";
    const addrMatch = clean.match(/(?:address|location|clinic|office|hospital|at)\s*[:\-]?\s*(\d+[^\n,]{8,80})/i);
    if (addrMatch) address = addrMatch[1].trim().slice(0,80);
    // Patient name (for member matching)
    let patient = "";
    const patientMatch = clean.match(/(?:patient|for|name)\s*[:\-]?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/);
    if (patientMatch) patient = patientMatch[1].trim();

    return { doctorName, date, time, address, patient, name: subject.replace(/^(Fwd:|Re:|Fw:)\s*/i,"").replace(/\s+/g," ").trim().slice(0,80) };
  }

  function apptMatchMember(patient, email) {
    if (!patient) return familyMembers[0] || "Me";
    const pLower = patient.toLowerCase();
    for (const m of familyMembers) {
      if (pLower.includes(m.toLowerCase()) || m.toLowerCase().includes(pLower.split(" ")[0])) return m;
    }
    return familyMembers[0] || "Me";
  }

  async function syncGmailAppointments() {
    if (!fwToken) { setApptSyncMsg("⚠️ Please log in first"); return; }
    setApptSyncing(true);
    setApptSyncMsg("📧 Scanning Gmail for medical appointments…");
    let imported = 0;

    const QUERIES = [
      'subject:("appointment" OR "doctor" OR "dental" OR "dentist" OR "clinic" OR "hospital" OR "lab results" OR "check-up" OR "checkup" OR "physical" OR "vaccination" OR "immunization") newer_than:365d',
      'subject:("Dr." OR "physician" OR "pediatric" OR "gynecolog" OR "eye exam" OR "optometr" OR "prescription" OR "pharmacy" OR "specialist" OR "referral" OR "surgery") newer_than:365d',
      'subject:("patient portal" OR "medical" OR "health" OR "test results" OR "blood work" OR "annual exam") newer_than:365d',
    ];

    try {
      const seenIds = new Set(apptItems.filter(a => a.gmailId).map(a => a.gmailId));
      for (const q of QUERIES) {
        const listRes = await fetch(
          `https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=25&q=${encodeURIComponent(q)}`,
          { headers: { Authorization: `Bearer ${fwToken}` } }
        );
        if (listRes.status === 401) { setApptSyncMsg("⚠️ Session expired — please log out and back in"); setApptSyncing(false); return; }
        if (!listRes.ok) continue;
        const listData = await listRes.json();
        for (const msg of (listData.messages || []).slice(0, 15)) {
          try {
            const gmailId = `appt_gmail_${msg.id}`;
            if (seenIds.has(gmailId)) continue;
            seenIds.add(gmailId);

            const msgRes = await fetch(
              `https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
              { headers: { Authorization: `Bearer ${fwToken}` } }
            );
            if (!msgRes.ok) continue;
            const msgData = await msgRes.json();
            const subject = msgData.payload?.headers?.find(h => h.name === "Subject")?.value || "";
            const body = apptExtractText(msgData.payload);
            const doctorType = apptClassifyDoctor(subject, body);
            if (!doctorType) continue; // not a medical email

            const fields = apptExtractFields(subject, body);
            if (!fields.date) {
              // fallback: use email date
              const dateHdr = msgData.payload?.headers?.find(h => h.name === "Date")?.value || "";
              const pd = new Date(dateHdr);
              if (!isNaN(pd)) fields.date = pd.toISOString().split("T")[0];
            }
            if (!fields.date) continue;

            const member = apptMatchMember(fields.patient, "");
            const item = {
              id: "a_" + Date.now() + "_" + Math.random().toString(36).slice(2,6),
              doctor: doctorType,
              doctorName: fields.doctorName || "",
              address: fields.address || "",
              member,
              date: fields.date,
              time: fields.time || "",
              notes: fields.name.slice(0, 120),
              done: new Date(fields.date) < new Date(new Date().toISOString().split("T")[0]),
              createdAt: Date.now(),
              addedBy: "Gmail Sync",
              gmailId,
              source: "gmail",
            };
            setApptItems(prev => {
              const updated = [...prev, item].sort((a,b) => new Date(a.date+" "+a.time) - new Date(b.date+" "+b.time));
              localStorage.setItem("pulse_appointments", JSON.stringify(updated));
              return updated;
            });
            imported++;
          } catch(e) { /* skip individual message errors */ }
        }
      }

      // Sync to Drive
      if (imported > 0 && fwWorkspace?.fileIds?.appointments && fwToken) {
        const latest = JSON.parse(localStorage.getItem("pulse_appointments") || "[]");
        await fwWriteFile(fwWorkspace.fileIds.appointments, latest, fwToken);
      }

      setApptSyncMsg(imported > 0 ? `✅ Imported ${imported} appointment${imported>1?"s":""}` : "✅ No new appointments found");
    } catch(e) {
      setApptSyncMsg("⚠️ Sync failed — check connection");
    }
    setApptSyncing(false);
    setTimeout(() => setApptSyncMsg(""), 4000);
  }

  // ─── TODO STATE ────────────────────────────────────────
  const [todoItems, setTodoItems]     = useState(() => { try { return JSON.parse(localStorage.getItem("pulse_todo_items") || "[]"); } catch { return []; } });
  const [todoInput, setTodoInput]     = useState("");
  const [todoLoading, setTodoLoading] = useState(false);
  const [editingTodoId, setEditingTodoId] = useState(null);
  const [showAddTodo, setShowAddTodo] = useState(false);
  const [editTodoText, setEditTodoText] = useState("");
  const [editTodoPriority, setEditTodoPriority] = useState("medium");
  const [editTodoDueDate, setEditTodoDueDate] = useState("");
  const [todoAssignee, setTodoAssignee] = useState("all");
  const TODO_PRIORITIES = [
    { id:"high",   label:"🔍´ High",   color:"#FF3B5C" },
    { id:"medium", label:"🟡 Medium", color:"#FFB800" },
    { id:"low",    label:"🟢 Low",    color:"#00C864" },
  ];
  const [todoPriority, setTodoPriority] = useState("medium");
  const [todoDueDate, setTodoDueDate]   = useState("");
  const [notifPermission, setNotifPermission] = useState(typeof Notification !== "undefined" ? Notification.permission : "default");

  // Request notification permission on first visit to todo tab
  useEffect(() => {
    if (mainTab === "todo" && typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().then(p => setNotifPermission(p));
    }
  }, [mainTab]);

  // Check daily for upcoming due-date notifications
  useEffect(() => {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    function checkDueDateNotifs() {
      const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split("T")[0];
      todoItems.filter(t => !t.done && t.dueDate === tomorrowStr).forEach(t => {
        new Notification("📹 Task due tomorrow!", {
          body: `"${t.text}" is due for ${t.assignee||"Family"}`,
          icon: "/favicon.ico",
        });
      });
    }
    checkDueDateNotifs();
  }, [todoItems]);

  useEffect(() => {
    if (mainTab === "todo") loadTodos();
  }, [mainTab]);

  async function loadTodos() {
    setTodoLoading(true);
    const cachedTodos = localStorage.getItem("pulse_todo_items");
    if (cachedTodos) { try { setTodoItems(JSON.parse(cachedTodos)); } catch(e) {} }
    try {
      if (fwWorkspace?.fileIds?.todos && fwToken) {
        const items = await fwReadFile(fwWorkspace.fileIds.todos, fwToken);
        if (items === null) { setTodoLoading(false); return; } // token expired — keep cache
        const sorted = (Array.isArray(items) ? items : []).sort((a,b) => (b.createdAt||0) - (a.createdAt||0));
        if (sorted.length > 0 || !cachedTodos) {
          setTodoItems(sorted);
          localStorage.setItem("pulse_todo_items", JSON.stringify(sorted));
        }
      }
    } catch(e) { /* keep cached data on error */ }
    setTodoLoading(false);
  }

  async function addTodo() {
    const text = todoInput.trim();
    if (!text) return;
    setTodoInput("");
    const due = todoDueDate;
    setTodoDueDate("");
    const item = { id: "t_" + Date.now(), text, done:false, priority: todoPriority, assignee: todoAssignee === "all" ? "Family" : todoAssignee, dueDate: due, createdAt: Date.now(), addedBy: fwUser?.name || "Family" };
    setTodoItems(prev => { const updated = [item, ...prev]; localStorage.setItem("pulse_todo_items", JSON.stringify(updated)); return updated; });
    if (fwWorkspace?.fileIds?.todos && fwToken) {
      const current = await fwReadFile(fwWorkspace.fileIds.todos, fwToken);
      if (current === null) return; // token expired
      await fwWriteFile(fwWorkspace.fileIds.todos, [item, ...(Array.isArray(current) ? current : [])], fwToken);
    }
  }

  async function toggleTodo(id, done) {
    setTodoItems(prev => { const updated = prev.map(i => i.id === id ? { ...i, done: !done } : i); localStorage.setItem("pulse_todo_items", JSON.stringify(updated)); return updated; });
    if (fwWorkspace?.fileIds?.todos && fwToken) {
      const current = await fwReadFile(fwWorkspace.fileIds.todos, fwToken);
      if (current === null) return; // token expired
      await fwWriteFile(fwWorkspace.fileIds.todos, (Array.isArray(current) ? current : []).map(i => i.id === id ? { ...i, done: !done } : i), fwToken);
    }
  }

  async function deleteTodo(id) {
    setTodoItems(prev => { const updated = prev.filter(i => i.id !== id); localStorage.setItem("pulse_todo_items", JSON.stringify(updated)); return updated; });
    if (fwWorkspace?.fileIds?.todos && fwToken) {
      const current = await fwReadFile(fwWorkspace.fileIds.todos, fwToken);
      if (current === null) return;
      await fwWriteFile(fwWorkspace.fileIds.todos, (Array.isArray(current) ? current : []).filter(i => i.id !== id), fwToken);
    }
  }
  async function updateTodo(id, newText, newPriority, newDueDate) {
    const text = newText.trim();
    if (!text) return;
    setEditingTodoId(null);
    setTodoItems(prev => {
      const updated = prev.map(i => i.id === id ? { ...i, text, priority: newPriority, dueDate: newDueDate } : i);
      localStorage.setItem("pulse_todo_items", JSON.stringify(updated));
      return updated;
    });
    if (fwWorkspace?.fileIds?.todos && fwToken) {
      const current = await fwReadFile(fwWorkspace.fileIds.todos, fwToken);
      if (current === null) return;
      await fwWriteFile(fwWorkspace.fileIds.todos, (Array.isArray(current) ? current : []).map(i => i.id === id ? { ...i, text, priority: newPriority, dueDate: newDueDate } : i), fwToken);
    }
  }

  // ─── GOOGLE OAUTH / RESERVATION SYNC MULTI-ACCOUNT (up to ────────────────────────────────────────
  // ⚠️  SETUP: Replace with your Google Cloud OAuth Client ID
  // ─── Steps New Project APIs & Services ────────────────────────────────────────
  //        → Enable "Gmail API" + "Google Calendar API"
  //        ─── Credentials OAuth Client ID Web application ────────────────────────────────────────
  //        → Authorised JS origins: your app URL
  const GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com";
  const GOOGLE_SCOPES = "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar.readonly email profile openid";
  const MAX_ACCOUNTS = 5;

  const [gAccounts, setGAccounts] = useState(() => {
    try { return JSON.parse(localStorage.getItem("pulse_gaccounts") || "[]"); } catch(e) { return []; }
  });
  const [gSyncing, setGSyncing]   = useState({}); // { email: true/false }
  const [gSyncMsg, setGSyncMsg]   = useState({}); // { email: "message" }

  function saveGAccounts(accounts) {
    setGAccounts(accounts);
    localStorage.setItem("pulse_gaccounts", JSON.stringify(accounts));
  }

  function googleAddAccount() {
    if (gAccounts.length >= MAX_ACCOUNTS) return;
    if (GOOGLE_CLIENT_ID === "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com") {
      alert("⚠️ Setup required\n\nAdd your Google OAuth Client ID to the code first:\n\n1. Go to console.cloud.google.com\n2. Create a project → Enable Gmail API + Google Calendar API\n3. Credentials → OAuth 2.0 Client ID → Web app\n4. Copy Client ID and replace YOUR_GOOGLE_CLIENT_ID in the code");
      return;
    }
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: window.location.origin + window.location.pathname,
      response_type: "token",
      scope: GOOGLE_SCOPES,
      prompt: "select_account consent",
    });
    sessionStorage.setItem("pulse_adding_account", "1");
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  function googleRemoveAccount(email) {
    saveGAccounts(gAccounts.filter(a => a.email !== email));
    setGSyncMsg(prev => { const n={...prev}; delete n[email]; return n; });
  }

  // Catch OAuth redirect token from URL hash
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("access_token") && sessionStorage.getItem("pulse_adding_account")) {
      sessionStorage.removeItem("pulse_adding_account");
      const params = new URLSearchParams(hash.replace("#","?"));
      const token  = params.get("access_token");
      if (token) {
        // Fetch email profile
        fetch("https://www.googleapis.com/oauth2/v1/userinfo?alt=json", {
          headers: { Authorization: `Bearer ${token}` }
        }).then(r => r.json()).then(profile => {
          const email = profile.email || `account_${Date.now()}`;
          const existing = JSON.parse(localStorage.getItem("pulse_gaccounts") || "[]");
          if (existing.find(a => a.email === email)) {
            // Update token for existing account
            const updated = existing.map(a => a.email === email ? { ...a, token } : a);
            localStorage.setItem("pulse_gaccounts", JSON.stringify(updated));
            setGAccounts(updated);
          } else {
            const updated = [...existing, { email, token, name: profile.name || email, picture: profile.picture || "" }];
            localStorage.setItem("pulse_gaccounts", JSON.stringify(updated));
            setGAccounts(updated);
          }
        }).catch(() => {
          const existing = JSON.parse(localStorage.getItem("pulse_gaccounts") || "[]");
          const email = `account_${Date.now()}`;
          const updated = [...existing, { email, token, name: email }];
          localStorage.setItem("pulse_gaccounts", JSON.stringify(updated));
          setGAccounts(updated);
        });
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, []);

  // ─── RESERVATION EMAIL PARSER ────────────────────────────────────────
  // Classifies Gmail booking confirmation emails into RESV_TYPES tabs.
  // Uses targeted Gmail search queries per category, fetches full message
  // body (plain text), and extracts structured fields via regex.

  function parseResvEmailBody(rawBody) {
    // Decode base64url → plain text
    try {
      const b64 = rawBody.replace(/-/g,'+').replace(/_/g,'/');
      return decodeURIComponent(escape(atob(b64)));
    } catch(e) { return ""; }
  }

  function extractTextPart(payload) {
    // Recursively find the first text/plain part
    if (!payload) return "";
    if (payload.mimeType === "text/plain" && payload.body?.data) return parseResvEmailBody(payload.body.data);
    if (payload.mimeType === "text/html"  && payload.body?.data) {
      // Strip HTML tags as fallback
      try { return parseResvEmailBody(payload.body.data).replace(/<[^>]+>/g," "); } catch(e) { return ""; }
    }
    for (const part of (payload.parts || [])) {
      const t = extractTextPart(part);
      if (t) return t;
    }
    return "";
  }

  function classifyResvEmail(subject, body) {
    const s = (subject + " " + body).toLowerCase();
    if (/flight|boarding pass|e-ticket|airline|depart|arrival|seat assignment|itinerary.*flight|book.*flight|flight.*book|air canada|delta|united|american airlines|southwest|lufthansa|emirates|indigo|air india|spicejet/.test(s)) return "✈️ Flight";
    if (/car rental|rental car|vehicle reservation|pick.?up.*car|hertz|avis|enterprise|budget|national|alamo|sixt|thrifty|dollar rent/.test(s)) return "🚗 Car Rental";
    if (/ticket|concert|show|event|festival|game|match|theater|theatre|museum|tour|admission|eventbrite|ticketmaster|stubhub|live nation/.test(s)) return "🎭 Event";
    if (/activity|adventure|excursion|tour|booking.*activity|experience|zipline|kayak|snorkel|dive|safari|spa|golf|bowling/.test(s)) return "🎳 Activity";
    return null; // unrecognised — skip
  }

  function extractResvFields(subject, body, type) {
    const lines = body.split(/\n|\r/).map(l => l.trim()).filter(Boolean);
    const all   = body.toLowerCase();

    // Confirmation number
    let confirmNo = "";
    const confMatch = body.match(/(?:confirmation|booking|reservation|record|pnr|reference)\s*(?:number|code|#|no\.?)?\s*[:\-]?\s*([A-Z0-9]{4,12})/i);
    if (confMatch) confirmNo = confMatch[1].toUpperCase();

    // Date — look for check-in / departure / event date
    let date = "";
    const datePatterns = [
      /(?:check.?in|arrival|departure|event|date)\s*[:\-]?\s*(\w+ \d{1,2},?\s*\d{4})/i,
      /(?:check.?in|arrival|departure|event|date)\s*[:\-]?\s*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i,
      /(\d{4}-\d{2}-\d{2})/,
    ];
    for (const p of datePatterns) {
      const m = body.match(p);
      if (m) { const d = new Date(m[1]); if (!isNaN(d)) { date = d.toISOString().split("T")[0]; break; } }
    }

    // Name / property / airline
    let name = subject.replace(/^(Fwd:|Re:|Fw:)\s*/i,"").replace(/\s+/g," ").trim().slice(0,80);

    // Address / location
    let address = "";
    const addrMatch = body.match(/(?:address|location|property|hotel|venue)\s*[:\-]?\s*([^\n]{10,80})/i);
    if (addrMatch) address = addrMatch[1].trim().slice(0,80);

    // Flight-specific: route
    let notes = "";
    if (type === "✈️ Flight") {
      const routeMatch = body.match(/([A-Z]{3})\s*(?:→|->|to|→)\s*([A-Z]{3})/i);
      if (routeMatch) notes = `${routeMatch[1].toUpperCase()} → ${routeMatch[2].toUpperCase()}`;
    }


    return { name, date, confirmNo, address, notes };
  }

  async function syncAccountReservations(account, currentResvItems) {
    const { email, token } = account;
    setGSyncing(prev => ({ ...prev, [email]: true }));
    setGSyncMsg(prev => ({ ...prev, [email]: "Scanning Gmail for bookings…" }));
    let imported = 0;

    // Gmail search queries per reservation category
    const QUERIES = [
      { q: 'subject:("booking confirmation" OR "flight confirmation" OR "e-ticket" OR "boarding pass" OR "itinerary") newer_than:180d', hint: "flight" },

      { q: 'subject:("car rental" OR "rental confirmation" OR "vehicle reservation") newer_than:180d', hint: "car" },
      { q: 'subject:("ticket" OR "event confirmation" OR "your order" OR "booking confirmed") newer_than:180d', hint: "event" },
    ];

    try {
      for (const { q } of QUERIES) {
        const listRes = await fetch(
          `https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=20&q=${encodeURIComponent(q)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!listRes.ok) continue;
        const listData = await listRes.json();
        for (const msg of (listData.messages || []).slice(0, 10)) {
          try {
            const googleId = `gmail_resv_${email}_${msg.id}`;
            if ((currentResvItems || []).some(r => r.googleId === googleId)) continue;

            const msgRes = await fetch(
              `https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!msgRes.ok) continue;
            const msgData = await msgRes.json();

            const subject  = msgData.payload?.headers?.find(h=>h.name==="Subject")?.value || "";
            const dateHdr  = msgData.payload?.headers?.find(h=>h.name==="Date")?.value || "";
            const body     = extractTextPart(msgData.payload) || msgData.snippet || "";
            if (!subject) continue;

            const type = classifyResvEmail(subject, body);
            if (!type) continue;

            const { name, date, confirmNo, address, notes } = extractResvFields(subject, body, type);
            // Use email date as fallback if no date extracted
            const fallbackDate = dateHdr ? new Date(dateHdr).toISOString().split("T")[0] : "";
            const finalDate = date || fallbackDate;
            if (!finalDate) continue;

            const item = {
              type, name, date: finalDate, time:"", partySize:"",
              confirmNo, address, notes,
              assignedTo: email,
              past: new Date(finalDate) < new Date(),
              source: "gmail", sourceEmail: email, googleId, createdAt: Date.now(),
            };

            setResvItems(prev => {
              if (prev.some(r => r.googleId === googleId)) return prev;
              return [...prev, { id: googleId, ...item }];
            });
            imported++;
          } catch(e) {}
        }
      }

      setGSyncMsg(prev => ({ ...prev, [email]: imported > 0 ? `✅ Imported ${imported} booking${imported>1?"s":""}` : "✅ Up to date" }));
    } catch(e) {
      if (String(e).includes("401")) {
        saveGAccounts(gAccounts.map(a => a.email === email ? { ...a, expired: true } : a));
        setGSyncMsg(prev => ({ ...prev, [email]: "⚠️ Session expired — reconnect" }));
      } else {
        setGSyncMsg(prev => ({ ...prev, [email]: "⚠️ Sync failed" }));
      }
    }
    setGSyncing(prev => ({ ...prev, [email]: false }));
  }

  async function syncAllAccounts() {
    // Capture a snapshot of current items to avoid stale-closure duplicates
    let snapshot = resvItems;
    for (const account of gAccounts) {
      await syncAccountReservations(account, snapshot);
      setResvItems(prev => { snapshot = prev; return prev; });
    }
  }
  const [resvItems, setResvItems]       = useState(() => { try { return JSON.parse(localStorage.getItem("pulse_resv_items") || "[]"); } catch { return []; } });
  const [resvLoading, setResvLoading]   = useState(false);
  const [showResvForm, setShowResvForm] = useState(false);
  const [resvForm, setResvForm]         = useState({ type:"", name:"", date:"", time:"", partySize:"", confirmNo:"", address:"", notes:"", assignedTo:"" });
  const [resvFilterType, setResvFilterType] = useState("all");
  const _resvUserKey = (fwUser?.email || "shared").replace(/[.#$[\]]/g, ",");
  const RESV_URL = `https://pulse-family-default-rtdb.firebaseio.com/reservations/${_resvUserKey}`;
  // Shared family workspace Firebase key — same for all members (based on shared folder ID)
  const _fwKey = (fwWorkspace?.folderId || fwUser?.email || "shared").replace(/[.#$\[\]]/g, ",");
  const GROCERY_FB   = `${FAMILY_BASE}/${_fwKey}/grocery`;
  const TODOS_FB     = `${FAMILY_BASE}/${_fwKey}/todos`;
  const APPTS_FB     = `${FAMILY_BASE}/${_fwKey}/appointments`;
  const TODO_URL = "https://pulse-family-default-rtdb.firebaseio.com/todos";
  const RESV_TYPES = [
    { id:"✈️ Flight",     label:"Flight",      emoji:"✈️", color:"#6366F1" },
    { id:"🎭 Event",      label:"Event",       emoji:"🎭", color:"#EC4899" },
    { id:"🚗 Car Rental", label:"Car Rental",  emoji:"🚗", color:"#F97316" },
    { id:"🎳 Activity",   label:"Activity",    emoji:"🎳", color:"#F59E0B" },
  ];

  useEffect(() => {
    if (mainTab === "reservations") {
      loadResvs().then(() => {
        // Auto-sync emails from all connected Google accounts
        if (gAccounts.length > 0) {
          (async () => {
            let snapshot = [];
            setResvItems(prev => { snapshot = prev; return prev; });
            for (const acc of gAccounts) {
              await syncAccountReservations(acc, snapshot);
              setResvItems(prev => { snapshot = prev; return prev; });
            }
          })();
        }
      });
    }
  }, [mainTab]);

  async function loadResvs() {
    setResvLoading(true);
    try {
      const res = await fetch(`${RESV_URL}.json`);
      const data = await res.json();
      if (data) {
        const validTypes = RESV_TYPES.map(t => t.id);
        const allItems = Object.entries(data).map(([id, val]) => ({ id, ...val }));
        // Remove invalid/phantom items (no name or unrecognised type) from Firebase
        const invalid = allItems.filter(i => !i.name || !validTypes.includes(i.type));
        for (const bad of invalid) {
          try { await fetch(`${RESV_URL}/${encodeURIComponent(bad.id)}.json`, { method:"DELETE" }); } catch(e) {}
        }
        const items = allItems.filter(i => i.name && validTypes.includes(i.type));
        items.sort((a, b) => new Date(a.date+" "+a.time) - new Date(b.date+" "+b.time));
        setResvItems(items);
        localStorage.setItem("pulse_resv_items", JSON.stringify(items));
      } else { setResvItems([]); localStorage.removeItem("pulse_resv_items"); }
    } catch(e) { try { const s=localStorage.getItem("pulse_resv_items"); setResvItems(s ? JSON.parse(s) : []); } catch { setResvItems([]); } }
    setResvLoading(false);
  }

  async function saveResv() {
    if (!resvForm.name || !resvForm.date) return;
    const item = { ...resvForm, past: false, createdAt: Date.now() };
    const tempId = "temp_" + Date.now();
    setResvItems(prev => { const updated = [...prev, { id: tempId, ...item }].sort((a,b) => new Date(a.date+" "+a.time) - new Date(b.date+" "+b.time)); localStorage.setItem("pulse_resv_items", JSON.stringify(updated)); return updated; });
    setShowResvForm(false);
    setResvForm({ type:"", name:"", date:"", time:"", partySize:"", confirmNo:"", address:"", notes:"", assignedTo:"" });
    try {
      const res = await fetch(`${RESV_URL}.json`, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(item) });
      const data = await res.json();
      setResvItems(prev => { const updated = prev.map(i => i.id === tempId ? { ...i, id: data.name } : i); localStorage.setItem("pulse_resv_items", JSON.stringify(updated)); return updated; });
    } catch(e) {}
  }

  async function deleteResv(id) {
    if (!id) return;
    setResvItems(prev => { const updated = prev.filter(i => i.id !== id); localStorage.setItem("pulse_resv_items", JSON.stringify(updated)); return updated; });
    try { await fetch(`${RESV_URL}/${encodeURIComponent(id)}.json`, { method:"DELETE" }); } catch(e) {}
  }

  async function markResvPast(id, past) {
    if (!id) return;
    setResvItems(prev => prev.map(i => i.id === id ? { ...i, past: !past } : i));
    try { await fetch(`${RESV_URL}/${encodeURIComponent(id)}.json`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ past: !past }) }); } catch(e) {}
  }

  // ─── CLOTHING STATE ────────────────────────────────────────
  const [clothingItems, setClothingItems]   = useState(() => { try { return JSON.parse(localStorage.getItem("pulse_clothing_items") || "[]"); } catch { return []; } });
  const [clothingInput, setClothingInput]   = useState("");
  const [clothingLoading, setClothingLoading] = useState(false);
  const [clothingMember, setClothingMember] = useState("all");
  const [clothingCategory, setClothingCategory] = useState("all");
  const _clothUserKey = (fwUser?.email || "shared").replace(/[.#$[\]]/g, ",");
  const CLOTHING_URL = `https://pulse-family-default-rtdb.firebaseio.com/clothing/${_clothUserKey}`;
  const CLOTHING_CATEGORIES = [
    { id:"all",        label:"All",       emoji:"👔", color:"#888" },
    { id:"Tops",       label:"Tops",      emoji:"👢", color:"#F43F5E" },
    { id:"Bottoms",    label:"Bottoms",   emoji:"👖", color:"#8B5CF6" },
    { id:"Shoes",      label:"Shoes",     emoji:"👞", color:"#0EA5E9" },
    { id:"Outerwear",  label:"Outerwear", emoji:"🧥", color:"#F97316" },
    { id:"Accessories",label:"Accessories",emoji:"👜",color:"#10B981" },
    { id:"Other",      label:"Other",     emoji:"🔍️", color:"#6B7280" },
  ];

  // ─── CONTACTS STATE ────────────────────────────────────────
  const [ctContacts, setCtContacts] = useState(() => {
    try { return JSON.parse(localStorage.getItem("pulse_contacts") || "[]"); } catch { return []; }
  });
  const [ctShowAdd, setCtShowAdd] = useState(false);
  const [ctEditId, setCtEditId] = useState(null);
  const [ctName, setCtName] = useState("");
  const [ctPhone, setCtPhone] = useState("");
  const [ctAddress, setCtAddress] = useState("");
  const [ctMember, setCtMember] = useState("me");
  const [ctSearch, setCtSearch] = useState("");
  const [ctSelectedMember, setCtSelectedMember] = useState("all");

  function ctSaveContacts(updated) {
    setCtContacts(updated);
    localStorage.setItem("pulse_contacts", JSON.stringify(updated));
    if (fwWorkspace?.fileIds?.contacts && fwToken) {
      fwWriteFile(fwWorkspace.fileIds.contacts, updated, fwToken).catch(()=>{});
    }
  }
  function ctSaveContact() {
    if (!ctName.trim()) return;
    const entry = { id: ctEditId || Date.now(), name: ctName.trim(), phone: ctPhone.trim(), address: ctAddress.trim(), member: ctMember };
    let updated;
    if (ctEditId) {
      updated = ctContacts.map(c => c.id === ctEditId ? entry : c);
    } else {
      updated = [...ctContacts, entry];
    }
    ctSaveContacts(updated);
    setCtShowAdd(false); setCtEditId(null); setCtName(""); setCtPhone(""); setCtAddress("");
  }
  function ctDeleteContact(id) {
    ctSaveContacts(ctContacts.filter(c => c.id !== id));
  }
  function ctEditContact(c) {
    setCtEditId(c.id); setCtName(c.name); setCtPhone(c.phone); setCtAddress(c.address || ""); setCtMember(c.member || "me"); setCtShowAdd(true);
  }

  // ─── FINANCE STATE ────────────────────────────────────────
  const [finTab, setFinTab] = useState("reminders"); // "reminders" | "lent"
  // Payment Reminders
  const [payReminders, setPayReminders] = useState(() => { try { return JSON.parse(localStorage.getItem("pulse_pay_reminders")||"[]"); } catch { return []; } });
  const [prShowAdd, setPrShowAdd] = useState(false);
  const [prEditId, setPrEditId] = useState(null);
  const [prName, setPrName] = useState("");
  const [prAmount, setPrAmount] = useState("");
  const [prCurrency, setPrCurrency] = useState("USD");
  const [prDueDate, setPrDueDate] = useState("");
  const [prRecurrence, setPrRecurrence] = useState("Monthly");
  const [prCategory, setPrCategory] = useState("Bill");
  const [prNotes, setPrNotes] = useState("");
  // Credit Card specific fields
  const [prCardLast4, setPrCardLast4] = useState("");
  const [prCardBank, setPrCardBank] = useState("");
  const [prMinDue, setPrMinDue] = useState("");
  const [prTotalDue, setPrTotalDue] = useState("");
  const [prStatementDate, setPrStatementDate] = useState("");
  const [prCreditLimit, setPrCreditLimit] = useState("");
  // Money Lent
  const [moneyLent, setMoneyLent] = useState(() => { try { return JSON.parse(localStorage.getItem("pulse_money_lent")||"[]"); } catch { return []; } });
  const [mlShowAdd, setMlShowAdd] = useState(false);
  const [mlEditId, setMlEditId] = useState(null);
  const [mlFriend, setMlFriend] = useState("");
  const [mlAmount, setMlAmount] = useState("");
  const [mlCurrency, setMlCurrency] = useState("USD");
  const [mlDate, setMlDate] = useState("");
  const [mlNote, setMlNote] = useState("");
  const [mlStatus, setMlStatus] = useState("pending"); // "pending" | "returned"

  function prSave(items) { setPayReminders(items); localStorage.setItem("pulse_pay_reminders", JSON.stringify(items)); if (fwWorkspace?.fileIds?.payReminders && fwToken) fwWriteFile(fwWorkspace.fileIds.payReminders, items, fwToken); }
  function mlSave(items) { setMoneyLent(items); localStorage.setItem("pulse_money_lent", JSON.stringify(items)); if (fwWorkspace?.fileIds?.moneyLent && fwToken) fwWriteFile(fwWorkspace.fileIds.moneyLent, items, fwToken); }

  function prSubmit() {
    if (!prName.trim() || !prDueDate) return;
    if (prCategory !== "Credit Card" && !prAmount) return;
    const ccFields = prCategory === "Credit Card" ? {
      cardLast4: prCardLast4.trim(), cardBank: prCardBank.trim(),
      minDue: parseFloat(prMinDue||"0"), totalDue: parseFloat(prTotalDue||"0"),
      statementDate: prStatementDate, creditLimit: parseFloat(prCreditLimit||"0")
    } : {};
    const entry = { id: prEditId || Date.now().toString(), name: prName.trim(),
      amount: prCategory === "Credit Card" ? parseFloat(prTotalDue||"0") : parseFloat(prAmount),
      currency: prCurrency, dueDate: prDueDate, recurrence: prRecurrence,
      category: prCategory, notes: prNotes.trim(), paid: false, ...ccFields };
    const updated = prEditId ? payReminders.map(r => r.id === prEditId ? entry : r) : [entry, ...payReminders];
    prSave(updated);
    setPrShowAdd(false); setPrEditId(null); setPrName(""); setPrAmount(""); setPrCurrency("USD"); setPrDueDate(""); setPrRecurrence("Monthly"); setPrCategory("Bill"); setPrNotes("");
    setPrCardLast4(""); setPrCardBank(""); setPrMinDue(""); setPrTotalDue(""); setPrStatementDate(""); setPrCreditLimit("");
  }
  function prEdit(r) {
    setPrEditId(r.id); setPrName(r.name); setPrAmount(String(r.amount)); setPrCurrency(r.currency||"USD");
    setPrDueDate(r.dueDate); setPrRecurrence(r.recurrence||"Monthly"); setPrCategory(r.category||"Bill"); setPrNotes(r.notes||"");
    if (r.category === "Credit Card") {
      setPrCardLast4(r.cardLast4||""); setPrCardBank(r.cardBank||"");
      setPrMinDue(String(r.minDue||"")); setPrTotalDue(String(r.totalDue||""));
      setPrStatementDate(r.statementDate||""); setPrCreditLimit(String(r.creditLimit||""));
    } else {
      setPrCardLast4(""); setPrCardBank(""); setPrMinDue(""); setPrTotalDue(""); setPrStatementDate(""); setPrCreditLimit("");
    }
    setPrShowAdd(true);
  }
  function prDelete(id) { prSave(payReminders.filter(r => r.id !== id)); }
  function prTogglePaid(id) { prSave(payReminders.map(r => r.id === id ? { ...r, paid: !r.paid } : r)); }

  function mlSubmit() {
    if (!mlFriend.trim() || !mlAmount || !mlDate) return;
    const entry = { id: mlEditId || Date.now().toString(), friend: mlFriend.trim(), amount: parseFloat(mlAmount), currency: mlCurrency, date: mlDate, note: mlNote.trim(), status: mlStatus };
    const updated = mlEditId ? moneyLent.map(r => r.id === mlEditId ? entry : r) : [entry, ...moneyLent];
    mlSave(updated);
    setMlShowAdd(false); setMlEditId(null); setMlFriend(""); setMlAmount(""); setMlCurrency("USD"); setMlDate(""); setMlNote(""); setMlStatus("pending");
  }
  function mlEdit(r) { setMlEditId(r.id); setMlFriend(r.friend); setMlAmount(String(r.amount)); setMlCurrency(r.currency||"USD"); setMlDate(r.date); setMlNote(r.note||""); setMlStatus(r.status||"pending"); setMlShowAdd(true); }
  function mlDelete(id) { mlSave(moneyLent.filter(r => r.id !== id)); }
  function mlToggleStatus(id) { mlSave(moneyLent.map(r => r.id === id ? { ...r, status: r.status === "returned" ? "pending" : "returned" } : r)); }

  // ─── SECURE FOLDER STATE ────────────────────────────────────────
  const [sfItems, setSfItems] = useState([]);
  const [sfUnlocked, setSfUnlocked] = useState(false);
  const [sfPinInput, setSfPinInput] = useState("");
  const [sfPinError, setSfPinError] = useState("");
  const [sfShowAdd, setSfShowAdd] = useState(false);
  const [sfEditId, setSfEditId] = useState(null);
  const [sfTab, setSfTab] = useState("bank"); // "bank" | "login"
  const [sfSearch, setSfSearch] = useState("");
  const [sfShowPw, setSfShowPw] = useState({}); // { id: true }
  const [sfViewItem, setSfViewItem] = useState(null); // expanded detail view
  // Form fields
  const [sfType, setSfType] = useState("bank");
  const [sfLabel, setSfLabel] = useState("");
  const [sfBankName, setSfBankName] = useState("");
  const [sfAccNo, setSfAccNo] = useState("");
  const [sfIfsc, setSfIfsc] = useState("");
  const [sfAccHolder, setSfAccHolder] = useState("");
  const [sfAccType, setSfAccType] = useState("Savings");
  const [sfUpi, setSfUpi] = useState("");
  const [sfNotes, setSfNotes] = useState("");
  const [sfBankCountry, setSfBankCountry] = useState("US"); // "IN" | "US"
  const [sfRoutingNo, setSfRoutingNo] = useState("");
  const [sfBankUserId, setSfBankUserId] = useState("");
  const [sfBankPassword, setSfBankPassword] = useState("");
  const [sfRegEmail, setSfRegEmail] = useState("");
  const [sfSiteName, setSfSiteName] = useState("");
  const [sfUsername, setSfUsername] = useState("");
  const [sfPassword, setSfPassword] = useState("");
  const [sfUrl, setSfUrl] = useState("");
  const SF_PIN_KEY = "pulse_sf_pin";
  const SF_DATA_KEY = "pulse_sf_data";
  const SF_DRIVE_KEY = "pulse_sf_drive_id"; // personal Drive file ID
  const [sfDriveFileId, setSfDriveFileId] = useState(() => localStorage.getItem(SF_DRIVE_KEY) || null);

  // ─── PERSONAL SETTINGS DRIVE FILE ────────────────────────────────────────
  const SETTINGS_DRIVE_KEY = "pulse_settings_drive_id";
  const [settingsDriveFileId, setSettingsDriveFileId] = useState(() => localStorage.getItem(SETTINGS_DRIVE_KEY) || null);

  async function settingsInitDriveFile(token) {
    const cached = localStorage.getItem(SETTINGS_DRIVE_KEY);
    if (cached) { setSettingsDriveFileId(cached); return cached; }
    const q = encodeURIComponent("name='PulseSettings.json' and 'root' in parents and trashed=false");
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,ownedByMe)`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const d = await res.json();
    const owned = (d.files || []).find(f => f.ownedByMe);
    if (owned) {
      localStorage.setItem(SETTINGS_DRIVE_KEY, owned.id);
      setSettingsDriveFileId(owned.id);
      return owned.id;
    }
    const form = new FormData();
    form.append("metadata", new Blob([JSON.stringify({ name: "PulseSettings.json", parents: ["root"] })], { type: "application/json" }));
    form.append("file", new Blob(["{}"], { type: "application/json" }));
    const cr = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
      method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form
    });
    const cd = await cr.json();
    if (cd.id) {
      localStorage.setItem(SETTINGS_DRIVE_KEY, cd.id);
      setSettingsDriveFileId(cd.id);
      return cd.id;
    }
    return null;
  }

  async function saveSettingsToDrive(patch) {
    if (!fwToken) return;
    try {
      const fileId = await settingsInitDriveFile(fwToken);
      if (!fileId) return;
      const existing = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${fwToken}` }
      }).then(r => r.text()).then(t => { try { return JSON.parse(t); } catch { return {}; } }).catch(() => ({}));
      const updated = { ...existing, ...patch };
      await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${fwToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(updated)
      });
    } catch(e) {}
  }

  // Initialize personal vault file on user's own Drive (not shared workspace)
  async function sfInitDriveFile(token) {
    if (sfDriveFileId) return sfDriveFileId;
    // Check localStorage cache
    const cached = localStorage.getItem(SF_DRIVE_KEY);
    if (cached) { setSfDriveFileId(cached); return cached; }
    // Search for existing personal vault file in user's Drive root
    const q = encodeURIComponent("name='PulseSecureVault.json' and 'root' in parents and trashed=false");
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,ownedByMe)`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const d = await res.json();
    const owned = (d.files || []).find(f => f.ownedByMe);
    if (owned) {
      localStorage.setItem(SF_DRIVE_KEY, owned.id);
      setSfDriveFileId(owned.id);
      return owned.id;
    }
    // Create new personal vault file
    const form = new FormData();
    form.append("metadata", new Blob([JSON.stringify({ name: "PulseSecureVault.json", parents: ["root"] })], { type: "application/json" }));
    form.append("file", new Blob(["[]"], { type: "application/json" }));
    const cr = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
      method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form
    });
    const cd = await cr.json();
    if (cd.id) {
      localStorage.setItem(SF_DRIVE_KEY, cd.id);
      setSfDriveFileId(cd.id);
      return cd.id;
    }
    return null;
  }

  // Simple AES-like XOR cipher with PIN as key (for localStorage obfuscation)
  function sfEncrypt(text, pin) {
    const key = String(pin);
    let result = "";
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return btoa(unescape(encodeURIComponent(result)));
  }
  function sfDecrypt(encoded, pin) {
    try {
      const text = decodeURIComponent(escape(atob(encoded)));
      const key = String(pin);
      let result = "";
      for (let i = 0; i < text.length; i++) {
        result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
      }
      return result;
    } catch { return null; }
  }

  function sfGetPin() {
    return localStorage.getItem(SF_PIN_KEY) || null;
  }

  function sfSetPin(pin) {
    const encPin = sfEncrypt(pin, "PulseSecure2026");
    localStorage.setItem(SF_PIN_KEY, encPin);
    // Backup encrypted PIN to Drive for recovery
    sfSavePinToDrive(encPin);
  }

  function sfSavePinToDrive(encPin) {
    if (!fwToken) return;
    sfInitDriveFile(fwToken).then(fileId => {
      if (!fileId) return;
      fwReadFile(fileId, fwToken).then(data => {
        const payload = Array.isArray(data) && data.length > 0 ? {...data[0]} : {};
        payload.pin = encPin;
        fwWriteFile(fileId, [payload], fwToken).catch(()=>{});
      }).catch(()=>{});
    }).catch(()=>{});
  }

  function sfVerifyPin(pin) {
    const stored = localStorage.getItem(SF_PIN_KEY);
    if (!stored) return false;
    return sfDecrypt(stored, "PulseSecure2026") === pin;
  }

  function sfUnlock(pin) {
    if (!sfGetPin()) {
      // First time — set PIN
      if (pin.length < 4) { setSfPinError("PIN must be at least 4 digits"); return; }
      sfSetPin(pin);
      setSfUnlocked(true);
      setSfPinInput("");
      setSfPinError("");
      sfLoadData(pin);
    } else {
      if (sfVerifyPin(pin)) {
        setSfUnlocked(true);
        setSfPinInput("");
        setSfPinError("");
        sfLoadData(pin);
      } else {
        setSfPinError("Wrong PIN");
        setSfPinInput("");
      }
    }
  }

  function sfLoadData(pin) {
    try {
      const raw = localStorage.getItem(SF_DATA_KEY);
      if (raw) {
        const decrypted = sfDecrypt(raw, pin);
        if (decrypted) setSfItems(JSON.parse(decrypted));
      }
    } catch { setSfItems([]); }
  }

  function sfSaveData(items, pin) {
    const p = pin || sfPinInput || sfDecrypt(localStorage.getItem(SF_PIN_KEY), "PulseSecure2026");
    const encrypted = sfEncrypt(JSON.stringify(items), p);
    localStorage.setItem(SF_DATA_KEY, encrypted);
    setSfItems(items);
    // Save encrypted data + PIN to personal Drive file
    if (fwToken) {
      const encPin = localStorage.getItem(SF_PIN_KEY) || "";
      sfInitDriveFile(fwToken).then(fileId => {
        if (fileId) fwWriteFile(fileId, [{encrypted, pin: encPin}], fwToken).catch(()=>{});
      }).catch(()=>{});
    }
  }

  function sfResetForm() {
    setSfLabel(""); setSfBankName(""); setSfAccNo(""); setSfIfsc(""); setSfAccHolder(""); setSfAccType("Savings");
    setSfUpi(""); setSfNotes(""); setSfSiteName(""); setSfUsername(""); setSfPassword(""); setSfUrl("");
    setSfRoutingNo(""); setSfBankCountry("US"); setSfBankUserId(""); setSfBankPassword(""); setSfRegEmail("");
    setSfEditId(null); setSfShowAdd(false);
  }

  function sfSaveItem() {
    const pin = sfDecrypt(localStorage.getItem(SF_PIN_KEY), "PulseSecure2026");
    if (sfTab === "bank") {
      if (!sfBankName || !sfAccNo) return;
      const item = {
        id: sfEditId || "sf_" + Date.now(),
        type: "bank",
        country: sfBankCountry,
        bankName: sfBankName,
        accNo: sfAccNo,
        ifsc: sfBankCountry === "IN" ? sfIfsc : "",
        routingNo: sfBankCountry === "US" ? sfRoutingNo : "",
        accHolder: sfAccHolder || fwUser?.name || "",
        accType: sfAccType,
        upi: sfBankCountry === "IN" ? sfUpi : "",
        bankUserId: sfBankUserId,
        bankPassword: sfBankPassword,
        regEmail: sfRegEmail,
        notes: sfNotes,
        createdAt: sfEditId ? (sfItems.find(i=>i.id===sfEditId)?.createdAt || Date.now()) : Date.now(),
      };
      const updated = sfEditId ? sfItems.map(i => i.id === sfEditId ? item : i) : [...sfItems, item];
      sfSaveData(updated, pin);
    } else {
      if (!sfSiteName || !sfUsername) return;
      const item = {
        id: sfEditId || "sf_" + Date.now(),
        type: "login",
        siteName: sfSiteName,
        username: sfUsername,
        password: sfPassword,
        url: sfUrl,
        notes: sfNotes,
        createdAt: sfEditId ? (sfItems.find(i=>i.id===sfEditId)?.createdAt || Date.now()) : Date.now(),
      };
      const updated = sfEditId ? sfItems.map(i => i.id === sfEditId ? item : i) : [...sfItems, item];
      sfSaveData(updated, pin);
    }
    sfResetForm();
  }

  function sfDeleteItem(id) {
    const pin = sfDecrypt(localStorage.getItem(SF_PIN_KEY), "PulseSecure2026");
    sfSaveData(sfItems.filter(i => i.id !== id), pin);
  }

  function sfEditItem(item) {
    setSfEditId(item.id);
    setSfTab(item.type);
    if (item.type === "bank") {
      setSfBankName(item.bankName); setSfAccNo(item.accNo); setSfIfsc(item.ifsc || "");
      setSfAccHolder(item.accHolder || ""); setSfAccType(item.accType || "Savings");
      setSfUpi(item.upi || ""); setSfNotes(item.notes || "");
      setSfBankCountry(item.country || "IN"); setSfRoutingNo(item.routingNo || "");
      setSfBankUserId(item.bankUserId || ""); setSfBankPassword(item.bankPassword || "");
      setSfRegEmail(item.regEmail || "");
    } else {
      setSfSiteName(item.siteName); setSfUsername(item.username);
      setSfPassword(item.password || ""); setSfUrl(item.url || ""); setSfNotes(item.notes || "");
    }
    setSfShowAdd(true);
  }

  function sfLock() {
    setSfUnlocked(false);
    setSfItems([]);
    setSfShowPw({});
    setSfChangingPin(false);
    setSfNewPin("");
    setSfViewItem(null);
    sfCancelRecovery();
  }

  const [sfChangingPin, setSfChangingPin] = useState(false);
  const [sfNewPin, setSfNewPin] = useState("");

  // OTP recovery state
  const [sfRecovering, setSfRecovering] = useState(false);
  const [sfOtpCode, setSfOtpCode] = useState("");
  const [sfOtpInput, setSfOtpInput] = useState("");
  const [sfOtpSending, setSfOtpSending] = useState(false);
  const [sfOtpVerified, setSfOtpVerified] = useState(false);
  const [sfResetPin, setSfResetPin] = useState("");

  async function sfSendOtp() {
    if (!fwUser?.email || !fwToken) {
      setSfPinError("Please sign in to your Google account first");
      return;
    }
    setSfOtpSending(true);
    setSfPinError("");
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setSfOtpCode(code);
    const email = fwUser.email;
    const rawEmail = [
      `To: ${email}`,
      `Subject: PulseApp Secure Vault - PIN Recovery OTP`,
      `Content-Type: text/html; charset=UTF-8`,
      ``,
      `<div style="font-family:Arial,sans-serif;max-width:400px;margin:0 auto;padding:20px;">`,
      `<h2 style="color:#EF4444;">🔐 Secure Vault PIN Recovery</h2>`,
      `<p>You requested to reset your Secure Vault PIN.</p>`,
      `<p>Your one-time verification code is:</p>`,
      `<div style="background:#f3f4f6;border-radius:12px;padding:20px;text-align:center;margin:16px 0;">`,
      `<span style="font-size:32px;font-weight:900;letter-spacing:8px;color:#1f2937;">${code}</span>`,
      `</div>`,
      `<p style="color:#6b7280;font-size:13px;">This code expires when you close the app. If you did not request this, please ignore this email.</p>`,
      `<p style="color:#9ca3af;font-size:11px;">— PulseApp</p>`,
      `</div>`
    ].join("\r\n");
    const encoded = btoa(unescape(encodeURIComponent(rawEmail))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
    try {
      const res = await fetch("https://www.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: { Authorization: `Bearer ${fwToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ raw: encoded })
      });
      if (res.ok) {
        setSfRecovering(true);
        setSfOtpSending(false);
        setSfPinError("");
        return;
      }
      const errData = await res.json().catch(()=>({}));
      const errMsg = errData?.error?.message || res.statusText || "Unknown error";
      if (res.status === 403 || res.status === 401) {
        setSfOtpSending(false);
        setSfPinError("Gmail permission needed. Please log out and log back in.");
        return;
      }
      console.error("Gmail send error:", res.status, errMsg);
    } catch(e) { console.error("Gmail send exception:", e); }
    setSfOtpSending(false);
    setSfPinError("Failed to send OTP. Please try again.");
  }

  function sfVerifyOtp() {
    if (sfOtpInput === sfOtpCode) {
      setSfOtpVerified(true);
      setSfPinError("");
    } else {
      setSfPinError("Invalid OTP. Please check your email.");
      setSfOtpInput("");
    }
  }

  function sfResetPinWithOtp() {
    if (sfResetPin.length < 4) { setSfPinError("PIN must be at least 4 digits"); return; }
    // Decrypt existing data with old PIN, re-encrypt with new one
    const oldEncPin = localStorage.getItem(SF_PIN_KEY);
    const oldPin = oldEncPin ? sfDecrypt(oldEncPin, "PulseSecure2026") : null;
    let items = [];
    if (oldPin) {
      try {
        const raw = localStorage.getItem(SF_DATA_KEY);
        if (raw) { const d = sfDecrypt(raw, oldPin); if (d) items = JSON.parse(d); }
      } catch {}
    }
    sfSetPin(sfResetPin);
    sfSaveData(items, sfResetPin);
    // Reset OTP state
    setSfRecovering(false);
    setSfOtpCode("");
    setSfOtpInput("");
    setSfOtpVerified(false);
    setSfResetPin("");
    setSfUnlocked(true);
    setSfPinInput("");
    setSfPinError("");
    sfLoadData(sfResetPin);
  }

  function sfCancelRecovery() {
    setSfRecovering(false);
    setSfOtpCode("");
    setSfOtpInput("");
    setSfOtpVerified(false);
    setSfResetPin("");
    setSfPinError("");
  }

  function sfChangePin() {
    if (sfNewPin.length < 4) { setSfPinError("New PIN must be at least 4 digits"); return; }
    // Re-encrypt all data with new PIN
    sfSetPin(sfNewPin);
    sfSaveData(sfItems, sfNewPin);
    setSfChangingPin(false);
    setSfNewPin("");
    setSfPinError("");
    setSfPinSuccess("✅ PIN changed successfully!");
    setTimeout(() => setSfPinSuccess(""), 3000);
  }

  const [sfPinSuccess, setSfPinSuccess] = useState("");

  // ─── PERIOD CALENDAR STATE ────────────────────────────────────────
  const [pcPeriods, setPcPeriods] = useState(() => {
    try { return JSON.parse(localStorage.getItem("pulse_pc_periods") || "[]"); } catch { return []; }
  });
  const [pcCycleLength, setPcCycleLength] = useState(() => parseInt(localStorage.getItem("pulse_pc_cycle") || "28", 10));
  const [pcPeriodLength, setPcPeriodLength] = useState(() => parseInt(localStorage.getItem("pulse_pc_period_len") || "5", 10));
  const [pcSelectedMonth, setPcSelectedMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [pcShowLog, setPcShowLog] = useState(false);
  const [pcLogDate, setPcLogDate] = useState("");
  const [pcSymptoms, setPcSymptoms] = useState([]);
  const [pcMood, setPcMood] = useState("");
  const [pcNotes, setPcNotes] = useState("");
  const [pcSelectedMember, setPcSelectedMember] = useState("me");
  const [pcDischarge, setPcDischarge] = useState("");
  const [pcFlow, setPcFlow] = useState("");
  const [pcLogType, setPcLogType] = useState("period"); // period|missed|discharge_only
  const [pcPregnancy, setPcPregnancy] = useState(() => {
    try { return JSON.parse(localStorage.getItem("pulse_pc_pregnancy") || "null"); } catch { return null; }
  });
  const [pcShowPregnancyModal, setPcShowPregnancyModal] = useState(false);
  const [pcTestResult, setPcTestResult] = useState(""); // positive|negative
  const [pcTestDate, setPcTestDate] = useState("");
  const [pcLmpDate, setPcLmpDate] = useState("");

  const PC_SYMPTOMS = ["Cramps","Headache","Bloating","Fatigue","Back Pain","Nausea","Acne","Breast Tenderness","Mood Swings","Insomnia","Dizziness","Hot Flashes"];
  const PC_MOODS = [{emoji:"😊",label:"Happy"},{emoji:"😢",label:"Sad"},{emoji:"😤",label:"Irritated"},{emoji:"😴",label:"Tired"},{emoji:"🥰",label:"Loving"},{emoji:"😰",label:"Anxious"},{emoji:"😐",label:"Neutral"}];
  const PC_DISCHARGE = [{id:"none",label:"None",emoji:"⚪"},{id:"white",label:"White / Creamy",emoji:"🤍"},{id:"clear",label:"Clear / Watery",emoji:"💧"},{id:"stretchy",label:"Clear / Stretchy (Egg White)",emoji:"🥚"},{id:"yellow",label:"Yellow / Green",emoji:"🟡"},{id:"brown",label:"Brown / Spotting",emoji:"🟤"},{id:"bloody",label:"Bloody",emoji:"🔴"}];
  const PC_FLOW = [{id:"light",label:"Light",emoji:"💧"},{id:"medium",label:"Medium",emoji:"💧💧"},{id:"heavy",label:"Heavy",emoji:"💧💧💧"},{id:"spotting",label:"Spotting",emoji:"·"}];

  function pcSavePeriods(updated) {
    setPcPeriods(updated);
    localStorage.setItem("pulse_pc_periods", JSON.stringify(updated));
    // Sync to Google Drive
    if (fwWorkspace?.fileIds?.periods && fwToken) {
      fwWriteFile(fwWorkspace.fileIds.periods, updated, fwToken).catch(()=>{});
    }
  }

  function pcSavePregnancyDrive(data) {
    if (fwWorkspace?.fileIds?.pregnancy && fwToken) {
      fwWriteFile(fwWorkspace.fileIds.pregnancy, data ? [data] : [], fwToken).catch(()=>{});
    }
  }

  function pcLogPeriod() {
    if (!pcLogDate) return;
    if (pcLogType === "pregnancy_test") {
      if (pcTestResult === "positive" && pcLmpDate) {
        pcStartPregnancy();
        const entry = { id: Date.now(), date: pcLogDate, type: "pregnancy_test", result: "positive", symptoms: pcSymptoms, mood: pcMood, notes: pcNotes || "Pregnancy test: Positive", member: pcSelectedMember, discharge: pcDischarge, flow: "" };
        pcSavePeriods([...pcPeriods, entry].sort((a,b) => new Date(a.date) - new Date(b.date)));
      } else if (pcTestResult === "negative") {
        const entry = { id: Date.now(), date: pcLogDate, type: "pregnancy_test", result: "negative", symptoms: [], mood: pcMood, notes: pcNotes || "Pregnancy test: Negative", member: pcSelectedMember, discharge: "", flow: "" };
        pcSavePeriods([...pcPeriods, entry].sort((a,b) => new Date(a.date) - new Date(b.date)));
      } else return;
    } else {
      const entry = { id: Date.now(), date: pcLogDate, type: pcLogType, symptoms: pcSymptoms, mood: pcMood, notes: pcNotes, member: pcSelectedMember, discharge: pcDischarge, flow: pcFlow };
      const updated = [...pcPeriods, entry].sort((a,b) => new Date(a.date) - new Date(b.date));
      pcSavePeriods(updated);
    }
    setPcShowLog(false); setPcLogDate(""); setPcSymptoms([]); setPcMood(""); setPcNotes(""); setPcDischarge(""); setPcFlow(""); setPcLogType("period"); setPcTestResult(""); setPcLmpDate(""); setPcTestDate("");
  }

  function pcDeleteEntry(id) {
    pcSavePeriods(pcPeriods.filter(p => p.id !== id));
  }

  function pcStartPregnancy() {
    // Use manually entered LMP or auto-detect from last logged period
    const memberPeriods = pcPeriods.filter(p => p.member === pcSelectedMember && p.type === "period");
    let lmp = pcLmpDate;
    if (!lmp && memberPeriods.length > 0) lmp = memberPeriods[memberPeriods.length - 1].date;
    if (!lmp) lmp = new Date().toISOString().slice(0,10);
    const lmpMs = new Date(lmp + "T00:00:00").getTime();
    const dueDate = new Date(lmpMs + 280 * 86400000).toISOString().slice(0,10);
    const data = { active: true, lmpDate: lmp, testDate: pcLogDate || pcTestDate || new Date().toISOString().slice(0,10), dueDate, member: pcSelectedMember };
    setPcPregnancy(data);
    localStorage.setItem("pulse_pc_pregnancy", JSON.stringify(data));
    pcSavePregnancyDrive(data);
    setPcShowPregnancyModal(false); setPcTestDate(""); setPcLmpDate("");
  }
  function pcEndPregnancy() {
    setPcPregnancy(null);
    localStorage.removeItem("pulse_pc_pregnancy");
    pcSavePregnancyDrive(null);
  }
  function pcGetPregnancyInfo() {
    if (!pcPregnancy?.active) return null;
    const lmpStr = pcPregnancy.lmpDate || pcPregnancy.startDate;
    const lmp = new Date(lmpStr + (lmpStr.length === 10 ? "T00:00:00" : ""));
    const today = new Date();
    const totalDays = Math.floor((today - lmp) / 86400000);
    const weeks = Math.floor(totalDays / 7);
    const days = totalDays % 7;
    const months = Math.floor(totalDays / 30.44);
    const trimester = weeks < 13 ? 1 : weeks < 27 ? 2 : 3;
    // Always recalculate due date from LMP to ensure correctness
    const dueDate = new Date(lmp.getTime() + 280 * 86400000);
    const daysLeft = Math.max(0, Math.floor((dueDate - today) / 86400000));
    const progress = Math.min(100, Math.round((totalDays / 280) * 100));
    return { weeks, days, months, trimester, totalDays, daysLeft, progress, dueDate };
  }
  function pcCalcCycleData() {
    const memberPeriods = pcPeriods.filter(p => p.member === pcSelectedMember && p.type === "period")
      .sort((a,b) => new Date(a.date) - new Date(b.date));
    if (memberPeriods.length < 2) return { cycles: [], avg: 28 };
    const cycles = [];
    for (let i = 1; i < memberPeriods.length; i++) {
      const gap = Math.round((new Date(memberPeriods[i].date) - new Date(memberPeriods[i-1].date)) / 86400000);
      if (gap >= 15 && gap <= 60) {
        cycles.push({ from: memberPeriods[i-1].date, to: memberPeriods[i].date, days: gap });
      }
    }
    if (cycles.length === 0) return { cycles: [], avg: 28 };
    const avg = Math.round(cycles.reduce((s,c) => s + c.days, 0) / cycles.length);
    return { cycles, avg };
  }

  function pcGetMissedPeriods() {
    const calcCycle = pcCalcCycleData().avg;
    const memberPeriods = pcPeriods.filter(p => p.member === pcSelectedMember && p.type !== "discharge_only");
    if (memberPeriods.length < 2) return [];
    const missed = [];
    for (let i = 1; i < memberPeriods.length; i++) {
      const gap = (new Date(memberPeriods[i].date) - new Date(memberPeriods[i-1].date)) / 86400000;
      if (gap > calcCycle + 10) {
        const expectedDate = new Date(new Date(memberPeriods[i-1].date).getTime() + calcCycle * 86400000);
        missed.push({ expected: expectedDate.toISOString().slice(0,10), gap: Math.round(gap), before: memberPeriods[i-1].date, after: memberPeriods[i].date });
      }
    }
    return missed;
  }

  function pcGetPredictions() {
    const calcCycle = pcCalcCycleData().avg;
    const memberPeriods = pcPeriods.filter(p => p.member === pcSelectedMember && p.type === "period");
    if (memberPeriods.length === 0) return [];
    const lastDate = new Date(memberPeriods[memberPeriods.length - 1].date);
    const predictions = [];
    for (let i = 1; i <= 6; i++) {
      const nextStart = new Date(lastDate);
      nextStart.setDate(nextStart.getDate() + calcCycle * i);
      predictions.push({ start: new Date(nextStart), end: new Date(nextStart.getTime() + (pcPeriodLength - 1) * 86400000) });
    }
    return predictions;
  }

  function pcGetFertileWindow() {
    const predictions = pcGetPredictions();
    if (predictions.length === 0) return [];
    return predictions.map(p => {
      const ovDay = new Date(p.start);
      ovDay.setDate(ovDay.getDate() - 14);
      return { start: new Date(ovDay.getTime() - 3 * 86400000), end: new Date(ovDay.getTime() + 2 * 86400000), ovulation: ovDay };
    });
  }

  useEffect(() => {
    if (mainTab === "clothing") loadClothing();
  }, [mainTab]);

  async function loadClothing() {
    setClothingLoading(true);
    try {
      const res = await fetch(`${CLOTHING_URL}.json`);
      const data = await res.json();
      if (data) {
        const items = Object.entries(data).map(([id, val]) => ({ id, ...val }));
        setClothingItems(items);
        localStorage.setItem("pulse_clothing_items", JSON.stringify(items));
      } else { setClothingItems([]); localStorage.removeItem("pulse_clothing_items"); }
    } catch(e) {
      const saved = localStorage.getItem("pulse_clothing_items");
      if (saved) setClothingItems(JSON.parse(saved));
      else setClothingItems([]);
    }
    setClothingLoading(false);
  }

  async function addClothingItem() {
    const text = clothingInput.trim();
    if (!text) return;
    setClothingInput("");
    const item = { text, purchased: false, member: clothingMember === "all" ? "Family" : clothingMember, category: clothingCategory === "all" ? "Other" : clothingCategory, createdAt: Date.now() };
    const tempId = "temp_" + Date.now();
    setClothingItems(prev => { const updated = [{ id: tempId, ...item }, ...prev]; localStorage.setItem("pulse_clothing_items", JSON.stringify(updated)); return updated; });
    try {
      const res = await fetch(`${CLOTHING_URL}.json`, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(item) });
      const data = await res.json();
      setClothingItems(prev => prev.map(i => i.id === tempId ? { ...i, id: data.name } : i));
    } catch(e) {}
  }

  async function toggleClothing(id, purchased) {
    if (!id) return;
    setClothingItems(prev => { const updated = prev.map(i => i.id === id ? { ...i, purchased: !purchased } : i); localStorage.setItem("pulse_clothing_items", JSON.stringify(updated)); return updated; });
    try { await fetch(`${CLOTHING_URL}/${encodeURIComponent(id)}.json`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ purchased: !purchased }) }); } catch(e) {}
  }

  async function deleteClothingItem(id) {
    if (!id) return;
    setClothingItems(prev => { const updated = prev.filter(i => i.id !== id); localStorage.setItem("pulse_clothing_items", JSON.stringify(updated)); return updated; });
    try { await fetch(`${CLOTHING_URL}/${encodeURIComponent(id)}.json`, { method:"DELETE" }); } catch(e) {}
  }

  // ─── PINGME STATE (v Google Login + Drive Storage + AES Encryption) ────────────────────────────────────────
  const PING_GOOGLE_CLIENT_ID  = "360320151404-1miklman0sr6gends9nuuuggecauneea.apps.googleusercontent.com";
  const PING_GOOGLE_SCOPES     = "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email";

  const [pingScreen, setPingScreen]         = useState("home"); // home|chat|newGroup|setPassword|login
  const [pingMe, setPingMe]                 = useState(() => { try { return JSON.parse(localStorage.getItem("pulse_ping_user")||"null"); } catch { return null; } });
  const [pingToken, setPingToken]           = useState(() => localStorage.getItem("pulse_ping_token")||"");
  const [pingEncryptEnabled, setPingEncryptEnabled] = useState(() => localStorage.getItem("pulse_ping_encrypt") === "true");
  const [pingPassword, setPingPassword]     = useState(() => sessionStorage.getItem("pulse_ping_pass")||"PulseDefaultKey2026");
  const [pingPasswordInput, setPingPasswordInput] = useState("");
  const [pingPasswordConfirm, setPingPasswordConfirm] = useState("");
  const [pingUsers, setPingUsers]           = useState([]);
  const [pingGroups, setPingGroups]         = useState([]);
  const [pingChats, setPingChats]           = useState([]);
  const [pingActiveChat, setPingActiveChat] = useState(null);
  const [pingMessages, setPingMessages]     = useState([]);
  const [pingInput, setPingInput]           = useState("");
  const [pingNewGroup, setPingNewGroup]     = useState({name:"", members:[]});
  const [pingOnline, setPingOnline]         = useState({});
  const [pingLoading, setPingLoading]       = useState(false);
  const [pingError, setPingError]           = useState("");
  const [pingMenuOpen, setPingMenuOpen]     = useState(false);
  const [pingDriveFiles, setPingDriveFiles] = useState({}); // {chatId: fileId}
  const pingMsgRef = useRef(null);

  // ─── AES- Encryption ────────────────────────────────────────
  async function pingDeriveKey(password) {
    const enc  = new TextEncoder();
    const raw  = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey(
      { name:"PBKDF2", salt: enc.encode("PulseAppPingMeSalt"), iterations:100000, hash:"SHA-256" },
      raw, { name:"AES-GCM", length:256 }, false, ["encrypt","decrypt"]
    );
  }

  async function pingEncrypt(text, password) {
    const key  = await pingDeriveKey(password);
    const iv   = crypto.getRandomValues(new Uint8Array(12));
    const enc  = new TextEncoder();
    const ct   = await crypto.subtle.encrypt({ name:"AES-GCM", iv }, key, enc.encode(text));
    const buf  = new Uint8Array(iv.byteLength + ct.byteLength);
    buf.set(iv); buf.set(new Uint8Array(ct), iv.byteLength);
    // Use chunked conversion to avoid call-stack overflow for large buffers
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < buf.length; i += chunkSize) {
      binary += String.fromCharCode(...buf.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  }

  async function pingDecrypt(b64, password) {
    try {
      const key  = await pingDeriveKey(password);
      const buf  = Uint8Array.from(atob(b64), c=>c.charCodeAt(0));
      const iv   = buf.slice(0,12);
      const ct   = buf.slice(12);
      const pt   = await crypto.subtle.decrypt({ name:"AES-GCM", iv }, key, ct);
      return new TextDecoder().decode(pt);
    } catch { return null; }
  }

  // ─── Google OAuth ────────────────────────────────────────
  function pingGoogleLogin() {
    const params = new URLSearchParams({
      client_id: PING_GOOGLE_CLIENT_ID,
      redirect_uri: window.location.origin + window.location.pathname,
      response_type: "token",
      scope: PING_GOOGLE_SCOPES,
      prompt: "select_account",
    });
    sessionStorage.setItem("pulse_ping_oauth", "1");
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  // Catch OAuth callback
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("access_token") && sessionStorage.getItem("pulse_ping_oauth")) {
      sessionStorage.removeItem("pulse_ping_oauth");
      const params = new URLSearchParams(hash.replace("#","?"));
      const token  = params.get("access_token");
      if (token) {
        setPingToken(token);
        localStorage.setItem("pulse_ping_token", token);
        // Fetch Google profile
        fetch("https://www.googleapis.com/oauth2/v1/userinfo?alt=json", {
          headers:{ Authorization:`Bearer ${token}` }
        }).then(r=>r.json()).then(profile=>{
          const user = { email: profile.email, name: profile.name, photo: profile.picture, id: profile.id };
          setPingMe(user);
          localStorage.setItem("pulse_ping_user", JSON.stringify(user));
          // Register in Firebase
          fetch(`${PING_USERS}/${profile.id}.json`, { method:"PUT", headers:{"Content-Type":"application/json"}, body: JSON.stringify({...user, updatedAt: Date.now()}) }).catch(()=>{});
          // Only prompt for password if encryption is enabled
          if (localStorage.getItem("pulse_ping_encrypt") === "true" && !sessionStorage.getItem("pulse_ping_pass")) {
            setMainTab("ping");
            setPingScreen("setPassword");
          }
        }).catch(()=>{});
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, []);

  // ─── Auto-bridge existing Google auth into PingMe ────────────────────────────────────────
  useEffect(() => {
    if (!fwUser || !fwToken) return;
    const user = { email: fwUser.email, name: fwUser.name, photo: fwUser.photo, id: fwUser.id || fwUser.email.replace(/[^a-zA-Z0-9]/g,"") };
    // Always register/refresh in Firebase whenever fwUser is available (on every app load)
    // This ensures the user appears in other family members' contact lists
    fetch(`${PING_BASE}/users/${user.id}.json`, { method:"PUT", headers:{"Content-Type":"application/json"}, body: JSON.stringify({...user, updatedAt: Date.now()}) }).catch(()=>{});
    if (!pingMe) {
      setPingMe(user);
      setPingToken(fwToken);
      localStorage.setItem("pulse_ping_user", JSON.stringify(user));
      localStorage.setItem("pulse_ping_token", fwToken);
      if (mainTab === "ping") {
        if (pingEncryptEnabled && !sessionStorage.getItem("pulse_ping_pass")) {
          setPingScreen("setPassword");
        } else {
          setPingScreen("home");
        }
      }
    }
  }, [fwUser?.email, fwToken]);

  // ─── PingMe Notifications ────────────────────────────────────────────────
  const pingLastNotifTs = useRef(Date.now());

  // Register service worker and request notification permission when user logs in
  useEffect(() => {
    if (!fwUser) return;
    // Register service worker for background notifications
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' })
        .then(reg => {
          // Tell service worker the user's email for background polling
          if (reg.active) reg.active.postMessage({ type: 'SET_USER_EMAIL', email: fwUser.email });
          else if (reg.installing) reg.installing.addEventListener('statechange', () => {
            if (reg.active) reg.active.postMessage({ type: 'SET_USER_EMAIL', email: fwUser.email });
          });
          // Register periodic sync if supported (Android Chrome)
          if ('periodicSync' in reg) {
            reg.periodicSync.register('pingme-check', { minInterval: 15 * 60 * 1000 }).catch(()=>{});
          }
        }).catch(()=>{});
    }
    // Request notification permission (non-intrusively, only if not decided yet)
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      // Delay 3s so it doesn't feel like an immediate popup
      setTimeout(() => {
        Notification.requestPermission().catch(()=>{});
      }, 3000);
    }
  }, [fwUser?.email]);

  // Poll Firebase for new notifications every 15 seconds when app is open
  useEffect(() => {
    if (!pingMe) return;
    const checkNotifs = async () => {
      if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
      if (document.visibilityState === 'visible' && mainTab === 'ping' && pingScreen === 'chat') return; // Already in chat, no need
      try {
        const safeEmail = pingMe.email.replace(/[.@]/g, '_');
        const res = await fetch(`${PING_BASE}/notifications/${safeEmail}.json`);
        if (!res.ok) return;
        const data = await res.json();
        if (!data) return;
        const entries = Object.entries(data)
          .map(([k, v]) => ({ key: k, ...v }))
          .filter(n => n.ts > pingLastNotifTs.current);
        for (const n of entries) {
          new Notification(`💬 ${n.fromName || 'Family member'}`, {
            body: n.preview ? `"${n.preview}"` : 'Sent you a message in PingMe',
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            tag: `pingme-${n.chatId}`,
          });
        }
        if (entries.length > 0) {
          pingLastNotifTs.current = Math.max(...entries.map(n => n.ts));
        }
      } catch(e) {}
    };
    checkNotifs();
    const interval = setInterval(checkNotifs, 15000);
    return () => clearInterval(interval);
  }, [pingMe?.email]);

  // ─── Drive Helpers ────────────────────────────────────────────────
  async function pingCreateDriveFolder(folderName, token) {
    const res = await fetch("https://www.googleapis.com/drive/v3/files", {
      method:"POST",
      headers:{ Authorization:`Bearer ${token}`, "Content-Type":"application/json" },
      body: JSON.stringify({ name: folderName, mimeType:"application/vnd.google-apps.folder" })
    });
    const d = await res.json();
    return d.id;
  }

  async function pingShareFolder(folderId, email, token) {
    await fetch(`https://www.googleapis.com/drive/v3/files/${folderId}/permissions`, {
      method:"POST",
      headers:{ Authorization:`Bearer ${token}`, "Content-Type":"application/json" },
      body: JSON.stringify({ role:"writer", type:"user", emailAddress: email })
    }).catch(()=>{});
  }

  async function pingWriteDriveFile(folderId, fileName, content, fileId, token) {
    if (fileId) {
      // Update existing file
      await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
        method:"PATCH",
        headers:{ Authorization:`Bearer ${token}`, "Content-Type":"text/plain" },
        body: content
      });
      return fileId;
    } else {
      // Create new file in folder
      const meta = { name: fileName, parents:[folderId] };
      const form = new FormData();
      form.append("metadata", new Blob([JSON.stringify(meta)], {type:"application/json"}));
      form.append("file", new Blob([content], {type:"application/json"}));
      const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
        method:"POST", headers:{ Authorization:`Bearer ${token}` }, body: form
      });
      const d = await res.json();
      return d.id;
    }
  }

  async function pingReadDriveFile(fileId, token) {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers:{ Authorization:`Bearer ${token}` }
    });
    return res.ok ? await res.text() : null;
  }

  async function pingFindDriveFile(folderName, fileName, token) {
    const q1 = encodeURIComponent(`name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q1}&includeItemsFromAllDrives=true&supportsAllDrives=true`, {
      headers:{ Authorization:`Bearer ${token}` }
    });
    const d = await res.json();
    const folder = d.files?.[0];
    if (!folder) return null;
    const q2 = encodeURIComponent(`'${folder.id}' in parents and name='${fileName}' and trashed=false`);
    const res2 = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q2}&includeItemsFromAllDrives=true&supportsAllDrives=true`, {
      headers:{ Authorization:`Bearer ${token}` }
    });
    const d2 = await res2.json();
    return { folderId: folder.id, fileId: d2.files?.[0]?.id||null };
  }

  // ─── FAMILY WORKSPACE DRIVE UTILITIES ────────────────────────────────────────

  // Find or create the PulseApp_Workspace folder and all JSON files
  async function fwInitWorkspace(token) {
    // Search for workspace folder — owned OR shared with me (for family members)
    const q = encodeURIComponent(`name='${WORKSPACE_FOLDER}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,ownedByMe)&includeItemsFromAllDrives=true&supportsAllDrives=true`, {
      headers:{ Authorization:`Bearer ${token}` }
    });
    const d = await res.json();
    // Prefer owned folder (head), then shared folder (member invited by head)
    const ownedFolder = d.files?.find(f => f.ownedByMe);
    const sharedFolder = d.files?.find(f => !f.ownedByMe);
    const chosenFolder = ownedFolder || sharedFolder || null;
    let folderId = chosenFolder?.id || null;
    const isOwner = chosenFolder?.ownedByMe ?? false;

    if (!folderId) {
      // No workspace found — create new one (this user becomes head)
      const cr = await fetch("https://www.googleapis.com/drive/v3/files", {
        method:"POST",
        headers:{ Authorization:`Bearer ${token}`, "Content-Type":"application/json" },
        body: JSON.stringify({ name: WORKSPACE_FOLDER, mimeType:"application/vnd.google-apps.folder" })
      });
      const cd = await cr.json();
      folderId = cd.id;
    }


    // Find or create each JSON file
    const fileIds = {};
    for (const [key, fileName] of Object.entries(WORKSPACE_FILES)) {
      const fq = encodeURIComponent(`'${folderId}' in parents and name='${fileName}' and trashed=false`);
      const fr = await fetch(`https://www.googleapis.com/drive/v3/files?q=${fq}&fields=files(id,name)&includeItemsFromAllDrives=true&supportsAllDrives=true`, {
        headers:{ Authorization:`Bearer ${token}` }
      });
      const fd = await fr.json();
      if (fd.files?.[0]?.id) {
        fileIds[key] = fd.files[0].id;
      } else {
        // Create empty file
        const meta = { name: fileName, parents:[folderId] };
        const form = new FormData();
        form.append("metadata", new Blob([JSON.stringify(meta)], {type:"application/json"}));
        form.append("file", new Blob(["[]"], {type:"application/json"}));
        const cr2 = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
          method:"POST", headers:{ Authorization:`Bearer ${token}` }, body: form
        });
        const cd2 = await cr2.json();
        fileIds[key] = cd2.id;
      }
    }
    return { folderId, fileIds, isOwner };
  }

  // Read a JSON file from Drive
  async function fwReadFile(fileId, token) {
    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`, {
        headers:{ Authorization:`Bearer ${token}` }
      });
      if (res.status === 401 || res.status === 403) return null; // token expired — signal caller
      if (!res.ok) return [];
      const text = await res.text();
      return JSON.parse(text || "[]");
    } catch { return null; } // network error — signal caller to use cache
  }

  // Write a JSON array to a Drive file
  async function fwWriteFile(fileId, data, token) {
    try {
      await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media&supportsAllDrives=true`, {
        method:"PATCH",
        headers:{ Authorization:`Bearer ${token}`, "Content-Type":"application/json" },
        body: JSON.stringify(data)
      });
    } catch(e) {}
  }

  // Share the workspace folder with a new member
  async function fwShareWorkspace(email, token) {
    if (!fwWorkspace?.folderId) return false;
    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fwWorkspace.folderId}/permissions?sendNotificationEmail=true`, {
        method:"POST",
        headers:{ Authorization:`Bearer ${token}`, "Content-Type":"application/json" },
        body: JSON.stringify({ role:"writer", type:"user", emailAddress: email })
      });
      return res.ok;
    } catch { return false; }
  }

  // Trigger Google OAuth for Family Workspace
  function fwGoogleLogin() {
    const params = new URLSearchParams({
      client_id: FAMILY_CLIENT_ID,
      redirect_uri: window.location.origin + window.location.pathname,
      response_type: "token",
      scope: FAMILY_SCOPES,
      prompt: "select_account",
    });
    sessionStorage.setItem("pulse_fw_oauth", "1");
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  // Catch Family Workspace OAuth callback
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("access_token") && sessionStorage.getItem("pulse_fw_oauth")) {
      sessionStorage.removeItem("pulse_fw_oauth");
      const params = new URLSearchParams(hash.replace("#","?"));
      const token  = params.get("access_token");
      if (token) {
        setFwToken(token);
        localStorage.setItem("pulse_fw_token", token);
        window.history.replaceState({}, "", window.location.pathname);
        // Fetch Google profile
        fetch("https://www.googleapis.com/oauth2/v1/userinfo?alt=json", {
          headers:{ Authorization:`Bearer ${token}` }
        }).then(r=>r.json()).then(async profile => {
          const user = { email: profile.email, name: profile.name, photo: profile.picture, id: profile.id };
          setFwUser(user);
          localStorage.setItem("pulse_fw_user", JSON.stringify(user));

          // Check if this user is already a known family member (added by a head)
          setFwLoading(true);
          try {
            const ws = await fwInitWorkspace(token);
            setFwWorkspace(ws);
            localStorage.setItem("pulse_fw_workspace", JSON.stringify(ws));
            const members = await fwReadFile(ws.fileIds.members, token);
            const existingMember = members.find(m => m.email === user.email);
            if (existingMember && existingMember.role) {
              // Already registered — check if gender is set
              const role = existingMember.role;
              setFwRole(role);
              localStorage.setItem("pulse_fw_role", role);
              // Update their profile info
              const updated = members.map(m => m.email === user.email ? { ...m, name: user.name, photo: user.photo } : m);
              await fwWriteFile(ws.fileIds.members, updated, token);
              setFwMembers(updated);
              if (!existingMember.gender) {
                // No gender set — ask for it
                setOnboardingStep("gender");
              } else {
                setOnboardingStep(null);
              }
            } else if (ws.isOwner) {
              // They own the workspace — likely a returning head, but also could be new
              const alreadyIn = members.find(m => m.email === user.email);
              if (alreadyIn) {
                // Returning user
                setFwRole("head");
                localStorage.setItem("pulse_fw_role", "head");
                setFwMembers(members);
                if (!alreadyIn.gender) {
                  setOnboardingStep("gender");
                } else {
                  setOnboardingStep(null);
                }
              } else {
                // New user who owns workspace — show role selection
                setFwMembers(members);
                setOnboardingStep("role");
              }
            } else {
              // New user, not owner, not pre-registered — show role selection
              setFwMembers(members);
              setOnboardingStep("role");
            }
          } catch(e) {
            // Workspace init failed — could be first time ever, show role selection
            setOnboardingStep("role");
          }
          setFwLoading(false);
        }).catch(() => setFwError("Could not fetch your Google profile."));
      }
    }
  }, []);

  // Load members when workspace is available
  useEffect(() => {
    if (fwWorkspace?.fileIds?.members && fwToken) {
      fwReadFile(fwWorkspace.fileIds.members, fwToken).then(m => {
        if (m === null) return; // expired token — keep existing state/cache
        const list = Array.isArray(m) ? m : [];
        setFwMembers(list);
        if (list.length > 0) localStorage.setItem("pulse_fw_members_cache", JSON.stringify(list));
      });
    }
  }, [fwWorkspace, fwToken]);

  // Load Period Calendar data from Drive when workspace is available
  useEffect(() => {
    if (fwWorkspace?.fileIds?.periods && fwToken) {
      fwReadFile(fwWorkspace.fileIds.periods, fwToken).then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setPcPeriods(data);
          localStorage.setItem("pulse_pc_periods", JSON.stringify(data));
        }
      });
    }
    if (fwWorkspace?.fileIds?.pregnancy && fwToken) {
      fwReadFile(fwWorkspace.fileIds.pregnancy, fwToken).then(data => {
        if (Array.isArray(data) && data.length > 0 && data[0]?.active) {
          setPcPregnancy(data[0]);
          localStorage.setItem("pulse_pc_pregnancy", JSON.stringify(data[0]));
        }
      });
    }
    if (fwWorkspace?.fileIds?.contacts && fwToken) {
      fwReadFile(fwWorkspace.fileIds.contacts, fwToken).then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setCtContacts(data);
          localStorage.setItem("pulse_contacts", JSON.stringify(data));
        }
      });
    }
    if (fwWorkspace?.fileIds?.appointments && fwToken) {
      fwReadFile(fwWorkspace.fileIds.appointments, fwToken).then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const sorted = data.sort((a,b) => new Date(a.date+" "+a.time) - new Date(b.date+" "+b.time));
          setApptItems(sorted);
          localStorage.setItem("pulse_appointments", JSON.stringify(sorted));
        }
      });
    }
    // Load Finance data from Drive
    if (fwWorkspace?.fileIds?.payReminders && fwToken) {
      fwReadFile(fwWorkspace.fileIds.payReminders, fwToken).then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setPayReminders(data);
          localStorage.setItem("pulse_pay_reminders", JSON.stringify(data));
        }
      });
    }
    if (fwWorkspace?.fileIds?.moneyLent && fwToken) {
      fwReadFile(fwWorkspace.fileIds.moneyLent, fwToken).then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setMoneyLent(data);
          localStorage.setItem("pulse_money_lent", JSON.stringify(data));
        }
      });
    }
    // Load personal settings from Drive on login (cross-device sync)
    if (fwToken) {
      settingsInitDriveFile(fwToken).then(fileId => {
        if (!fileId) return;
        fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
          headers: { Authorization: `Bearer ${fwToken}` }
        }).then(r => r.text()).then(t => {
          try {
            const s = JSON.parse(t);
            if (s.reminderWindow)  { setReminderWindow(s.reminderWindow);  localStorage.setItem("pulse_reminder_window", s.reminderWindow); }
            if (s.notifSound)      { setNotifSound(s.notifSound);          localStorage.setItem("pulse_notif_sound", s.notifSound); }
            if (s.secondCountry)   { const c = SECOND_COUNTRY_OPTIONS.find(x => x.key === s.secondCountry); if (c) { setSecondCountry(c); localStorage.setItem("pulse_second_country", s.secondCountry); } }
            if (s.pcCycleLength)   { setPcCycleLength(parseInt(s.pcCycleLength,10)); localStorage.setItem("pulse_pc_cycle", s.pcCycleLength); }
            if (s.pcPeriodLength)  { setPcPeriodLength(parseInt(s.pcPeriodLength,10)); localStorage.setItem("pulse_pc_period_len", s.pcPeriodLength); }
            if (s.pingEncrypt !== undefined) { setPingEncryptEnabled(s.pingEncrypt === true); localStorage.setItem("pulse_ping_encrypt", s.pingEncrypt ? "true" : "false"); }
          } catch(e) {}
        }).catch(()=>{});
      }).catch(()=>{});
    }

    // Load secure vault from personal Drive (not shared workspace)
    if (fwToken) {
      sfInitDriveFile(fwToken).then(fileId => {
        if (!fileId) return;
        fwReadFile(fileId, fwToken).then(data => {
          if (Array.isArray(data) && data.length > 0) {
            if (data[0]?.encrypted) {
              localStorage.setItem(SF_DATA_KEY, data[0].encrypted);
            }
            if (data[0]?.pin) {
              localStorage.setItem(SF_PIN_KEY, data[0].pin);
            }
          }
        });
      }).catch(()=>{});
    }
  }, [fwWorkspace, fwToken]);

  // Send invite email via Gmail API
  async function fwSendInviteEmail(toEmail, toName, token) {
    const fromName = fwUser?.name || "PulseApp";
    const appUrl = "https://pulseofpaddy-bit.github.io";
    const subject = `${fromName} invited you to join PulseApp Family`;
    const htmlBody = [
      `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>`,
      `<body style="margin:0;padding:0;background:#f3f0ff;font-family:Arial,sans-serif;">`,
      `<div style="max-width:480px;margin:32px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(168,85,247,0.12);">`,
      `  <div style="background:linear-gradient(135deg,#1a0533,#3b0764);padding:32px 28px 24px;text-align:center;">`,
      `    <div style="font-size:48px;margin-bottom:8px;">&#128156;</div>`,
      `    <h1 style="color:#fff;font-size:24px;font-weight:900;margin:0 0 6px;">You're invited to PulseApp!</h1>`,
      `    <p style="color:rgba(255,255,255,0.65);font-size:14px;margin:0;">${fromName} added you to their family workspace</p>`,
      `  </div>`,
      `  <div style="padding:28px 28px 8px;">`,
      `    <p style="color:#1f2937;font-size:15px;margin:0 0 16px;">Hi <strong>${toName}</strong>,</p>`,
      `    <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 20px;"><strong>${fromName}</strong> has added you to their <strong>PulseApp family workspace</strong>. PulseApp is your family hub for shared groceries, to-dos, appointments, contacts, movies, and more.</p>`,
      `    <div style="background:#f9f5ff;border:1px solid rgba(168,85,247,0.2);border-radius:14px;padding:18px 20px;margin-bottom:20px;">`,
      `      <p style="color:#6b21a8;font-size:13px;font-weight:700;margin:0 0 12px;">&#128241; How to install on your phone</p>`,
      `      <ol style="color:#374151;font-size:13px;line-height:1.8;margin:0;padding-left:18px;">`,
      `        <li>Open the link below in your phone browser</li>`,
      `        <li><strong>iPhone:</strong> Tap Share &#8594; "Add to Home Screen"</li>`,
      `        <li><strong>Android:</strong> Tap menu &#8594; "Add to Home screen"</li>`,
      `        <li>Log in with your Google account (${toEmail})</li>`,
      `        <li>You'll automatically join the family workspace!</li>`,
      `      </ol>`,
      `    </div>`,
      `    <div style="text-align:center;margin-bottom:24px;">`,
      `      <a href="${appUrl}" style="display:inline-block;background:linear-gradient(135deg,#a855f7,#7c3aed);color:#fff;text-decoration:none;font-size:16px;font-weight:800;padding:16px 40px;border-radius:14px;">&#128242; Open PulseApp</a>`,
      `      <p style="color:#9ca3af;font-size:12px;margin:10px 0 0;">${appUrl}</p>`,
      `    </div>`,
      `  </div>`,
      `  <div style="background:#f9f5ff;padding:16px 28px;text-align:center;border-top:1px solid rgba(168,85,247,0.1);">`,
      `    <p style="color:#9ca3af;font-size:11px;margin:0;">Sent via PulseApp &middot; Family Workspace Invitation</p>`,
      `  </div>`,
      `</div></body></html>`
    ].join("\n");
    const plainBody = [
      `Hi ${toName},`,
      ``,
      `${fromName} has added you to their PulseApp family workspace!`,
      ``,
      `Install PulseApp on your phone: ${appUrl}`,
      ``,
      `iPhone: Open link in Safari -> Share -> "Add to Home Screen"`,
      `Android: Open link in Chrome -> Menu -> "Add to Home screen"`,
      ``,
      `Log in with your Google account (${toEmail}) and you will automatically join the family workspace.`,
      ``,
      `- PulseApp`
    ].join("\n");
    const rawEmail = [
      `To: ${toEmail}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="PulseAppBoundary"`,
      ``,
      `--PulseAppBoundary`,
      `Content-Type: text/plain; charset=UTF-8`,
      ``,
      plainBody,
      ``,
      `--PulseAppBoundary`,
      `Content-Type: text/html; charset=UTF-8`,
      ``,
      htmlBody,
      ``,
      `--PulseAppBoundary--`
    ].join("\r\n");
    const encoded = btoa(unescape(encodeURIComponent(rawEmail))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
    try {
      const res = await fetch("https://www.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ raw: encoded })
      });
      if (res.ok) return true;
    } catch(e) {}
    const mailtoSubject = encodeURIComponent(subject);
    const mailtoBody = encodeURIComponent(plainBody);
    window.open(`mailto:${toEmail}?subject=${mailtoSubject}&body=${mailtoBody}`, "_blank");
    return true;
  }

  // Invite a family member
  async function fwInviteMember() {
    const email = fwInviteEmail.trim().toLowerCase();
    const name = fwInviteName.trim() || email.split("@")[0];
    const gender = fwInviteGender;
    if (!email || !email.includes("@") || !fwToken || !fwWorkspace) return;
    setFwInviteStatus("sending");
    try {
      // Share Drive folder (best-effort — don't block on failure)
      await fwShareWorkspace(email, fwToken).catch(() => {});
      // Add to Members.json — use cached fwMembers if Drive read fails
      let current = await fwReadFile(fwWorkspace.fileIds.members, fwToken);
      if (!current || !Array.isArray(current)) {
        // Token expired or network error — fall back to in-memory state
        current = fwMembers || [];
      }
      const alreadyIn = current.some(m => m.email === email);
      const updated = alreadyIn ? current : [...current, { name, email, gender, role: "member", joinedAt: Date.now() }];
      if (!alreadyIn) {
        // Try to write to Drive, but don't fail if it doesn't work
        await fwWriteFile(fwWorkspace.fileIds.members, updated, fwToken).catch(() => {});
        setFwMembers(updated);
        // Also save to localStorage as backup
        localStorage.setItem("pulse_fw_members_cache", JSON.stringify(updated));
      }
      // Send invite email — completely independent, never blocks member add
        // Reload from Drive to confirm write succeeded and refresh member list
        fwReadFile(fwWorkspace.fileIds.members, fwToken).then(m => {
          if (Array.isArray(m) && m.length > 0) {
            setFwMembers(m);
            localStorage.setItem("pulse_fw_members_cache", JSON.stringify(m));
          }
        }).catch(() => {});
      fwSendInviteEmail(email, name, fwToken).catch(() => {});
      setFwInviteEmail("");
      setFwInviteName("");
      setFwInviteGender("");
      setFwInviteStatus("sent");
      setTimeout(() => { setFwInviteStatus(""); setFwShowInvite(false); }, 3000);
    } catch(e) {
      console.error("fwInviteMember error:", e);
      setFwInviteStatus("error");
      setTimeout(() => setFwInviteStatus(""), 4000);
    }
  }

  // Remove a family member
  async function fwRemoveMember(email) {
    if (!fwToken || !fwWorkspace) return;
    const current = await fwReadFile(fwWorkspace.fileIds.members, fwToken);
    const updated = current.filter(m => m.email !== email);
    await fwWriteFile(fwWorkspace.fileIds.members, updated, fwToken);
    setFwMembers(updated);
  }

  // Sign out of Family Workspace
  function fwSignOut() {
    ["pulse_fw_user","pulse_fw_token","pulse_fw_role","pulse_fw_workspace"].forEach(k => localStorage.removeItem(k));
    setFwUser(null); setFwToken(null); setFwRole(null); setFwWorkspace(null); setFwMembers([]);
    setOnboardingStep("splash");
  }

  // ─── ONBOARDING HANDLERS ────────────────────────────────────────
  async function onboardingSelectRole(role) {
    if (!fwUser || !fwToken) return;
    setFwLoading(true);
    try {
      let ws = fwWorkspace;
      if (!ws) {
        ws = await fwInitWorkspace(fwToken);
        setFwWorkspace(ws);
        localStorage.setItem("pulse_fw_workspace", JSON.stringify(ws));
      }
      setFwRole(role);
      localStorage.setItem("pulse_fw_role", role);
      // Add self to members
      const rawMembers = await fwReadFile(ws.fileIds.members, fwToken);
      const members = Array.isArray(rawMembers) ? rawMembers : [];
      const alreadyIn = members.some(m => m.email === fwUser.email);
      if (!alreadyIn) {
        const updated = [...members, { name: fwUser.name, email: fwUser.email, gender: onboardingGender, role, joinedAt: Date.now(), photo: fwUser.photo }];
        await fwWriteFile(ws.fileIds.members, updated, fwToken);
        setFwMembers(updated);
        localStorage.setItem("pulse_fw_members_cache", JSON.stringify(updated));
      } else {
        // Update role and gender
        const updated = members.map(m => m.email === fwUser.email ? { ...m, role, gender: onboardingGender || m.gender, name: fwUser.name, photo: fwUser.photo } : m);
        await fwWriteFile(ws.fileIds.members, updated, fwToken);
        setFwMembers(updated);
        localStorage.setItem("pulse_fw_members_cache", JSON.stringify(updated));
      }
      if (role === "head") {
        setOnboardingStep("add_members");
      } else {
        // Member — if they found a shared workspace (not owned by them), they joined successfully
        if (!isOwner) {
          // They joined the head's shared workspace — auto-proceed
          setFwRole("member");
          localStorage.setItem("pulse_fw_role", "member");
          setOnboardingStep(null);
        } else {
          // They own this workspace — check if pre-registered as member by a head
          const memberEntry = members.find(m => m.email === fwUser.email);
          if (memberEntry && memberEntry.role === "member") {
            setOnboardingStep(null);
          } else {
            // Not pre-registered — show waiting message
            setOnboardingMemberError("Your email has not been added by a Family Head yet. Ask your family head to add your email in Settings → Family Workspace → + Invite.");
            setOnboardingStep("member_wait");
          }
        }
      }
    } catch(e) {
      setFwError("Could not set up workspace. Please try again.");
    }
    setFwLoading(false);
  }

  async function onboardingInviteMembers() {
    if (!fwToken || !fwWorkspace) return;
    setOnboardingInviting(true);
    const validEmails = onboardingAddEmails.filter(e => e.trim() && e.includes("@"));
    for (let i = 0; i < validEmails.length; i++) {
      const origIdx = onboardingAddEmails.indexOf(validEmails[i]);
      const email = validEmails[i].trim().toLowerCase();
      const name = (onboardingAddNames[origIdx] || "").trim() || email.split("@")[0];
      const gender = (onboardingAddGenders[origIdx] || "").trim();
      await fwShareWorkspace(email, fwToken).catch(() => {});
      const current = await fwReadFile(fwWorkspace.fileIds.members, fwToken);
      if (!current.some(m => m.email === email)) {
        const updated = [...current, { name, email, gender, role: "member", joinedAt: Date.now() }];
        await fwWriteFile(fwWorkspace.fileIds.members, updated, fwToken);
        setFwMembers(updated);
      }
      // Send invite email with app install link
      await fwSendInviteEmail(email, name, fwToken).catch(() => {});
    }
    setOnboardingInviting(false);
    setOnboardingStep(null);
  }

  // ─── Chat Functions ────────────────────────────────────────
  async function pingSaveMessages(chatId, messages, token) {
    if (!token || !pingPassword) return;
    const plain   = JSON.stringify(messages);
    const encrypted = await pingEncrypt(plain, pingPassword);
    const folderName = `PingMe_${chatId}`;
    // Find or create folder+file
    let found = await pingFindDriveFile(folderName, "messages.json", token).catch(()=>null);
    let folderId = found?.folderId;
    let fileId   = found?.fileId || pingDriveFiles[chatId];
    if (!folderId) {
      folderId = await pingCreateDriveFolder(folderName, token).catch(()=>null);
      if (!folderId) return;
      // Store folder ID in Firebase so other user can find it
      fetch(`${PING_CHATS}/${chatId}.json`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ folderId, folderName }) }).catch(()=>{});
    }
    const newFileId = await pingWriteDriveFile(folderId, "messages.json", encrypted, fileId, token).catch(()=>null);
    if (newFileId) setPingDriveFiles(p=>({...p,[chatId]:newFileId}));
  }

  async function pingLoadMessages(chat) {
    if (!chat || !pingToken || !pingPassword) return;
    try {
      setPingLoading(true);
      const folderName = `PingMe_${chat.id}`;
      const found = await pingFindDriveFile(folderName, "messages.json", pingToken);
      if (found?.fileId) {
        const encrypted = await pingReadDriveFile(found.fileId, pingToken);
        if (encrypted) {
          const plain = await pingDecrypt(encrypted, pingPassword);
          // Only update messages if we successfully decrypted real content
          if (plain) {
            try {
              const parsed = JSON.parse(plain);
              if (Array.isArray(parsed)) setPingMessages(parsed);
            } catch {}
          }
          // If decryption failed, keep existing messages — do NOT clear
        }
        // If no encrypted content returned, keep existing messages — do NOT clear
      } else {
        // Folder not found in own Drive — check Firebase for folder reference from other user
        const chatData = await fetch(`${PING_CHATS}/${chat.id}.json`).then(r=>r.json()).catch(()=>null);
        if (chatData?.folderId) {
          const q3 = encodeURIComponent(`'${chatData.folderId}' in parents and name='messages.json' and trashed=false`);
          const res2 = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q3}&supportsAllDrives=true&includeItemsFromAllDrives=true`, {
            headers:{ Authorization:`Bearer ${pingToken}` }
          });
          const d2 = await res2.json();
          if (d2.files?.[0]?.id) {
            const encrypted = await pingReadDriveFile(d2.files[0].id, pingToken);
            if (encrypted) {
              const plain = await pingDecrypt(encrypted, pingPassword);
              if (plain) {
                try {
                  const parsed = JSON.parse(plain);
                  if (Array.isArray(parsed)) setPingMessages(parsed);
                } catch {}
              }
            }
          }
          // If folder exists in Firebase but file not found yet, keep existing messages — do NOT clear
        }
        // If no Firebase reference either, this is a brand new chat — keep existing messages (may be optimistic)
        // NEVER call setPingMessages([]) here — it would wipe optimistically-added messages
      }
    } catch(e) {
      // On error, keep existing messages — do NOT clear
      console.warn("pingLoadMessages error:", e);
    }
    setPingLoading(false);
  }

  async function pingSend() {
    const text = pingInput.trim();
    if (!text || !pingActiveChat || !pingMe || !pingPassword) return;
    setPingInput("");
    const ts = Date.now();
    const msg  = { id: ts, text, from: pingMe.email, fromName: pingMe.name, ts, read: false };
    const newMsgs = [...pingMessages, msg];
    setPingMessages(newMsgs);
    setTimeout(()=>{ if(pingMsgRef.current) pingMsgRef.current.scrollTop=pingMsgRef.current.scrollHeight; },50);
    // Save to Drive — messages are already shown optimistically above
    await pingSaveMessages(pingActiveChat.id, newMsgs, pingToken);
    // Write notification record for each recipient so they get browser/push notification
    const recipients = pingActiveChat.type === 'group'
      ? (pingActiveChat.members || []).filter(e => e !== pingMe.email)
      : [pingActiveChat.otherEmail].filter(Boolean);
    for (const recipientEmail of recipients) {
      const safeEmail = recipientEmail.replace(/[.@]/g, '_');
      const notifKey = `${ts}_${pingMe.id || pingMe.email.replace(/[^a-zA-Z0-9]/g,'')}`;
      fetch(`${PING_BASE}/notifications/${safeEmail}/${notifKey}.json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: pingActiveChat.id,
          chatName: pingActiveChat.name,
          from: pingMe.email,
          fromName: pingMe.name,
          preview: text.length > 60 ? text.slice(0, 60) + '…' : text,
          ts,
        })
      }).catch(()=>{});
    }
    // Legacy notify flag
    fetch(`${PING_CHATS}/${pingActiveChat.id}/notify.json`, { method:"PUT", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ from: pingMe.email, ts }) }).catch(()=>{});
  }

  function pingChatId(emailA, emailB) {
    return [emailA, emailB].sort().map(e=>e.replace(/[.@]/g,"_")).join("__");
  }

  function pingOpenDm(user) {
    const id   = pingChatId(pingMe.email, user.email);
    const chat = { type:"dm", id, name: user.name, color: user.color||"#7C3AED", otherEmail: user.email };
    setPingActiveChat(chat);
    setPingScreen("chat");
    pingLoadMessages(chat);
  }

  async function pingCreateGroup() {
    const name = pingNewGroup.name.trim();
    if (!name || pingNewGroup.members.length === 0 || !pingToken) return;
    const color   = PING_COLORS[Math.floor(Math.random()*PING_COLORS.length)];
    const members = [...pingNewGroup.members, pingMe.email];
    const groupId = `grp_${Date.now()}`;
    // Create shared Drive folder
    const folderName = `PingMe_${groupId}`;
    const folderId   = await pingCreateDriveFolder(folderName, pingToken).catch(()=>null);
    // Share with all members
    if (folderId) {
      for (const email of pingNewGroup.members) {
        await pingShareFolder(folderId, email, pingToken);
      }
    }
    const group = { name, color, members, createdBy: pingMe.email, folderId, folderName, createdAt: Date.now() };
    const res   = await fetch(`${PING_GROUPS}.json`, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(group) }).catch(()=>null);
    const d     = res ? await res.json() : null;
    const chat  = { type:"group", id: d?.name||groupId, name, color, members, folderId };
    setPingGroups(prev => [...prev, { ...chat, lastMsg:"", lastTs: Date.now() }]);
    setPingNewGroup({name:"", members:[]});
    setPingActiveChat(chat);
    setPingMessages([]);
    setPingScreen("chat");
  }

  async function pingLoadUsers() {
    try {
      const [ur, pr] = await Promise.all([
        fetch(`${PING_USERS}.json`).then(r=>r.ok?r.json():null),
        fetch(`${PING_PRESENCE}.json`).then(r=>r.ok?r.json():null),
      ]);
      if (pr) setPingOnline(pr);
      // Build contact list from family members (fwMembers) — not all global Firebase users
      // This ensures only YOUR family appears in contacts
      const familyEmails = (fwMembers||[]).map(m=>m.email).filter(e=>e!==pingMe?.email);
      const firebaseUsers = ur ? Object.values(ur) : [];
      // For each family member, use Firebase data if available, else fall back to fwMembers data
      const contacts = familyEmails.map(email => {
        const fb = firebaseUsers.find(u=>u.email===email);
        const fm = (fwMembers||[]).find(m=>m.email===email);
        if (fb) return fb;
        // Not in Firebase yet — create a placeholder from fwMembers so they still appear
        if (fm) return { email: fm.email, name: fm.name, photo: fm.photo||null, id: fm.email.replace(/[^a-zA-Z0-9]/g,""), updatedAt: 0 };
        return null;
      }).filter(Boolean);
      setPingUsers(contacts);
    } catch(e) {}
  }

  async function pingUpdatePresence() {
    if (!pingMe) return;
    fetch(`${PING_PRESENCE}/${pingMe.id}.json`, { method:"PUT", headers:{"Content-Type":"application/json"}, body: JSON.stringify(Date.now()) }).catch(()=>{});
  }

  async function pingLoadChats() {
    if (!pingMe) return;
    try {
      const gr = await fetch(`${PING_GROUPS}.json`).then(r=>r.ok?r.json():null);
      if (gr) {
        const myGroups = Object.entries(gr)
          .filter(([,g])=>g.members?.includes(pingMe.email))
          .map(([id,g])=>({ type:"group", id, name:g.name, color:g.color, members:g.members, folderId:g.folderId, lastMsg:"", lastTs:g.createdAt||0 }));
        setPingGroups(myGroups);
      }
    } catch(e) {}
  }

  // Polling
  useEffect(() => {
    if (mainTab !== "ping" || !pingMe) return;
    pingLoadUsers();
    pingLoadChats();
    pingUpdatePresence();
    const interval = setInterval(()=>{ pingUpdatePresence(); pingLoadUsers(); }, 30000);
    return () => clearInterval(interval);
  }, [mainTab, pingMe?.email]);

  // Refresh contacts when family member list changes (e.g. after Drive sync)
  useEffect(() => {
    if (mainTab === "ping" && pingMe && fwMembers.length > 0) {
      pingLoadUsers();
    }
  }, [fwMembers.length]);

  useEffect(() => {
    if (mainTab !== "ping" || pingScreen !== "chat" || !pingActiveChat) return;
    // Poll every 10s — 5s was too fast and caused race conditions with Drive API indexing
    const interval = setInterval(()=>pingLoadMessages(pingActiveChat), 10000);
    return () => clearInterval(interval);
  }, [mainTab, pingScreen, pingActiveChat?.id]);

  // ─── CALC STATE ────────────────────────────────────────
  const [calcTab, setCalcTab] = useState("discount");
  // Discount
  const [discOrigPrice, setDiscOrigPrice] = useState("");
  const [discPercent, setDiscPercent]     = useState("");
  // Interest
  const [intPrincipal, setIntPrincipal]   = useState("");
  const [intRate, setIntRate]             = useState("");
  const [intYears, setIntYears]           = useState("");
  const [intType, setIntType]             = useState("simple"); // simple | compound
  // Currency
  const [currAmount, setCurrAmount]       = useState("");
  const [currDir, setCurrDir]             = useState("usdToInr"); // usdToInr | inrToUsd
  const [currRate, setCurrRate]           = useState(null);
  const [currRateLoading, setCurrRateLoading] = useState(false);
  // Units
  const [unitCategory, setUnitCategory]  = useState("weight");
  const [unitFrom, setUnitFrom]          = useState("");
  const [unitFromUnit, setUnitFromUnit]  = useState("kg");
  const [unitToUnit, setUnitToUnit]      = useState("lbs");

  // Fetch live USD→INR rate
  async function fetchCurrRate() {
    setCurrRateLoading(true);
    try {
      const res = await fetch("https://open.er-api.com/v6/latest/USD");
      const d   = await res.json();
      setCurrRate(d.rates?.INR || 83.5);
    } catch { setCurrRate(83.5); }
    setCurrRateLoading(false);
  }
  useEffect(() => { if (mainTab === "calc" && calcTab === "currency" && !currRate) fetchCurrRate(); }, [mainTab, calcTab]);

  // Unit conversion logic
  const UNIT_CATS = {
    weight: { label:"⚖️ Weight",      units:["kg","lbs","grams","ounces","tons"] },
    length: { label:"📏 Length",      units:["meters","km","miles","feet","inches","cm"] },
    area:   { label:"📐 Area",        units:["sqft","sqm","acres","hectares"] },
    volume: { label:"🧪 Volume",      units:["liters","gallons","ml","cups","fl oz"] },
    temp:   { label:"🌡️ Temp",        units:["Celsius","Fahrenheit","Kelvin"] },
    speed:  { label:"💨 Speed",       units:["kmh","mph","m/s","knots"] },
  };

  function convertUnit(val, from, to) {
    const v = parseFloat(val);
    if (isNaN(v)) return "";
    // Convert to base unit then to target
    const toBase = {
      // length → meters
      km:1000, miles:1609.34, meters:1, feet:0.3048, inches:0.0254, cm:0.01,
      // weight → grams
      kg:1000, lbs:453.592, grams:1, ounces:28.3495, tons:1e6,
      // temp handled separately
      // volume → liters
      liters:1, gallons:3.78541, ml:0.001, cups:0.236588, "fl oz":0.0295735,
      // area → sqm
      sqft:0.092903, sqm:1, acres:4046.86, hectares:10000,
      // speed → m/s
      kmh:0.277778, mph:0.44704, "m/s":1, knots:0.514444,
    };
    if (from === to) return v.toLocaleString("en-IN", {maximumFractionDigits:4});
    // Temperature special case
    if (from === "Celsius" || to === "Celsius" || from === "Fahrenheit" || to === "Fahrenheit" || from === "Kelvin" || to === "Kelvin") {
      let c = from === "Celsius" ? v : from === "Fahrenheit" ? (v-32)*5/9 : v - 273.15;
      let result = to === "Celsius" ? c : to === "Fahrenheit" ? c*9/5+32 : c + 273.15;
      return result.toLocaleString("en-IN", {maximumFractionDigits:4});
    }
    const base = v * (toBase[from] || 1);
    const result = base / (toBase[to] || 1);
    return result.toLocaleString("en-IN", {maximumFractionDigits:4});
  }

  useEffect(() => {
    if (mainTab === "restaurants") {
      if (userCoords) {
        // Already have coords — fetch immediately
        fetchNearby(userCoords.lat, userCoords.lng, restaurantCuisine);
      } else {
        // Try GPS first, then fall back to Canton, MI
        setRestaurantLoading(true);
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
              setUserCoords(coords);
              // Reverse geocode to get city name
              fetch(`https://nominatim.openstreetmap.org/reverse?lat=${coords.lat}&lon=${coords.lng}&format=json&zoom=10`)
                .then(r=>r.json())
                .then(d=>{
                  const city = d.address?.city || d.address?.town || d.address?.village || d.address?.county || "Your Location";
                  const state = d.address?.state ? `, ${d.address.state.replace(/^(.{2}).*/, "$1").toUpperCase()}` : "";
                  setUserCity(`${city}${state}`);
                })
                .catch(()=>setUserCity("Your Location"));
              fetchNearby(coords.lat, coords.lng, restaurantCuisine);
            },
            () => {
              // GPS unavailable — use default
              const defaultCoords = { lat: 42.3098, lng: -83.4827 };
              setUserCoords(defaultCoords);
              setUserCity("Canton, MI");
              fetchNearby(defaultCoords.lat, defaultCoords.lng, restaurantCuisine);
            },
            { timeout: 5000, enableHighAccuracy: false, maximumAge: 60000 }
          );
        } else {
          const defaultCoords = { lat: 42.3098, lng: -83.4827 };
          setUserCoords(defaultCoords);
          setUserCity("Canton, MI");
          fetchNearby(defaultCoords.lat, defaultCoords.lng, restaurantCuisine);
        }
      }
    }
  }, [mainTab, restaurantCuisine]);

  async function searchByCity(city, cuisine) {
    setRestaurantLoading(true);
    setRestaurantError(null);
    setRestaurants([]);
    setSearchedCity(city);
    setUserCity(city);
    // Use Overpass area-based geocoding — no separate geocoder needed, fully CORS-safe
    const cuisineMap = { american:"american", indian:"indian", italian:"italian", chinese:"chinese", mexican:"mexican", japanese:"japanese" };
    const tag = cuisineMap[cuisine] || cuisine;
    // Extract just the city name (strip state/country suffixes for Overpass area matching)
    const cityName = city.split(",")[0].trim().replace(/["\\\n\r]/g, '');
    if (!cityName || cityName.length > 100) {
      setRestaurantError("Please enter a valid city name.");
      setRestaurantLoading(false);
      return;
    }
    const areaQuery = `[out:json][timeout:25];area["name"="${cityName}"]["admin_level"~"6|7|8"]->.a;(node["amenity"="restaurant"]["cuisine"~"${tag}",i](area.a);way["amenity"="restaurant"]["cuisine"~"${tag}",i](area.a););out center 10;`;
    try {
      const res = await fetch("https://overpass.kumi.systems/api/interpreter", { method:"POST", mode:"cors", headers:{"Content-Type":"application/x-www-form-urlencoded"}, body:"data="+encodeURIComponent(areaQuery) });
      const data = await res.json();
      let elements = (data.elements || []).map(el => ({
        ...el,
        lat: el.lat ?? el.center?.lat,
        lon: el.lon ?? el.center?.lon,
      })).filter(el => el.lat && el.lon);
      if (elements.length === 0) {
        // Fallback: any restaurant in the area, no cuisine filter
        const fallbackQuery = `[out:json][timeout:25];area["name"="${cityName}"]["admin_level"~"6|7|8"]->.a;(node["amenity"="restaurant"](area.a);way["amenity"="restaurant"](area.a););out center 10;`;
        const res2 = await fetch("https://overpass.kumi.systems/api/interpreter", { method:"POST", mode:"cors", headers:{"Content-Type":"application/x-www-form-urlencoded"}, body:"data="+encodeURIComponent(fallbackQuery) });
        const data2 = await res2.json();
        elements = (data2.elements || []).map(el => ({
          ...el,
          lat: el.lat ?? el.center?.lat,
          lon: el.lon ?? el.center?.lon,
        })).filter(el => el.lat && el.lon);
      }
      if (elements.length === 0) {
        setRestaurantError("City not found or no restaurants listed. Try another city name.");
        setRestaurantLoading(false);
        return;
      }
      // Derive a center coordinate from the first result for distance calculations
      const lat = elements[0].lat;
      const lng = elements[0].lon;
      setUserCoords({ lat, lng });
      parseAndSet(elements, lat, lng);
    } catch(e) {
      setRestaurantError("Could not fetch restaurants. Check your connection and try again.");
      setRestaurantLoading(false);
    }
  }

  async function fetchNearby(lat, lng, cuisine) {
    setRestaurantLoading(true);
    setRestaurantError(null);
    setRestaurants([]);

    // Cuisine tag aliases — OSM uses these exact values
    const cuisineMap = {
      american: "american",
      indian:   "indian",
      italian:  "italian",
      chinese:  "chinese",
      mexican:  "mexican",
      japanese: "japanese",
    };
    const tag = cuisineMap[cuisine] || cuisine;

    // 20 miles ≈ 32187 metres
    const radius = 32187;

    // Multiple Overpass endpoints — try each in order if one fails/rate-limits
    const OVERPASS_ENDPOINTS = [
      "https://overpass-api.de/api/interpreter",
      "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
      "https://overpass.openstreetmap.ru/api/interpreter",
    ];

    const doFetch = async (q) => {
      let lastErr;
      for (const endpoint of OVERPASS_ENDPOINTS) {
        try {
          const res = await fetch(endpoint, {
            method: "POST", mode: "cors",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: "data=" + encodeURIComponent(q),
          });
          if (!res.ok) { lastErr = new Error(`HTTP ${res.status}`); continue; }
          const text = await res.text();
          if (text.trim().startsWith("<")) { lastErr = new Error("XML response"); continue; }
          const d = JSON.parse(text);
          return (d.elements || []).map(el => ({
            ...el,
            lat: el.lat ?? el.center?.lat,
            lon: el.lon ?? el.center?.lon,
          })).filter(el => el.lat && el.lon && el.tags?.name);
        } catch(e) { lastErr = e; }
      }
      throw lastErr || new Error("All endpoints failed");
    };

    try {
      // ─── Step ────────────────────────────────────────
      const radius10mi = 16093; // 10 miles in metres
      const cuisineQuery10 = `[out:json][timeout:25];(
        node["amenity"="restaurant"]["cuisine"~"${tag}",i](around:${radius10mi},${lat},${lng});
        way["amenity"="restaurant"]["cuisine"~"${tag}",i](around:${radius10mi},${lat},${lng});
      );out center 20;`;

      let elements = await doFetch(cuisineQuery10);

      // ─── Step ────────────────────────────────────────
      if (elements.length < 5) {
        const cuisineQuery20 = `[out:json][timeout:30];(
          node["amenity"="restaurant"]["cuisine"~"${tag}",i](around:${radius},${lat},${lng});
          way["amenity"="restaurant"]["cuisine"~"${tag}",i](around:${radius},${lat},${lng});
        );out center 20;`;
        try { elements = await doFetch(cuisineQuery20); } catch(_) { /* keep 10mi results */ }
      }

      // ─── Step ────────────────────────────────────────
      if (elements.length === 0) {
        const fallbackQuery = `[out:json][timeout:25];(
          node["amenity"="restaurant"](around:${radius10mi},${lat},${lng});
          way["amenity"="restaurant"](around:${radius10mi},${lat},${lng});
        );out center 20;`;
        elements = await doFetch(fallbackQuery);
      }

      if (elements.length === 0) {
        setRestaurantError("No restaurants found nearby. Try a different cuisine.");
        setRestaurantLoading(false);
        return;
      }

      // Sort by distance (nearest first)
      elements.sort((a, b) => {
        const distA = Math.hypot((a.lat - lat) * 111, (a.lon - lng) * 111 * Math.cos(lat * Math.PI / 180));
        const distB = Math.hypot((b.lat - lat) * 111, (b.lon - lng) * 111 * Math.cos(lat * Math.PI / 180));
        return distA - distB;
      });

      parseAndSet(elements, lat, lng);
    } catch(e) {
      setRestaurantError("Could not fetch restaurants. Check your connection and try again.");
      setRestaurantLoading(false);
    }
  }

  // ─── Opening hours parser ────────────────────────────────────────
  // Parses a subset of the OSM opening_hours spec:
  //   "Mo-Fr 11:00-22:00; Sa-Su 12:00-23:00"
  //   "24/7"
  //   "Mo-Su 09:00-21:00"
  // Returns: true (open), false (closed), or null (unknown)
  function checkIsOpen(ohStr) {
    if (!ohStr || ohStr === 'Hours not listed') return null;
    const s = ohStr.trim();
    if (s === '24/7' || s === 'open') return true;
    if (s === 'closed') return false;

    const now = new Date();
    const dayIdx = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const dayNames = ['su','mo','tu','we','th','fr','sa'];
    const curDay = dayNames[dayIdx];
    const curMins = now.getHours() * 60 + now.getMinutes();

    const parseMins = (t) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + (m || 0);
    };

    const dayAbbrs = { mo:0, tu:1, we:2, th:3, fr:4, sa:5, su:6 };
    // Expand a day range like "mo-fr" to array of day abbrs
    const expandDays = (spec) => {
      spec = spec.toLowerCase().trim();
      if (spec.includes('-')) {
        const [from, to] = spec.split('-').map(d => d.trim());
        const fi = dayAbbrs[from], ti = dayAbbrs[to];
        if (fi === undefined || ti === undefined) return [];
        const days = [];
        // Handle wrap-around (e.g. sa-su)
        let i = fi;
        while (true) {
          days.push(dayNames[i]);
          if (i === ti) break;
          i = (i + 1) % 7;
          if (days.length > 7) break; // safety
        }
        return days;
      }
      return [spec];
    };

    // Split into rules by ";"
    const rules = s.split(';').map(r => r.trim()).filter(Boolean);
    for (const rule of rules) {
      // Match: [day spec] HH:MM-HH:MM
      const m = rule.match(/^([a-zA-Z,\-]+)?\s*(\d{1,2}:\d{2})\s*[-→]\s*(\d{1,2}:\d{2})/);
      if (!m) continue;
      const daySpec = m[1] ? m[1].trim() : 'mo-su';
      const open = parseMins(m[2]);
      const close = parseMins(m[3]);

      // Expand comma-separated day groups e.g. "Mo-Fr,Sa"
      const dayGroups = daySpec.split(',').map(d => d.trim());
      const applicableDays = dayGroups.flatMap(g => expandDays(g));

      if (applicableDays.includes(curDay)) {
        // Overnight hours: e.g. 22:00-02:00
        if (close < open) {
          if (curMins >= open || curMins < close) return true;
        } else {
          if (curMins >= open && curMins < close) return true;
        }
        return false; // Day matches but outside hours
      }
    }
    return false; // No matching rule found for today
  }

  function parseAndSet(elements, userLat, userLng) {
    const results = elements.slice(0, 20).map(el => {
      const t = el.tags || {};
      const dlat = (el.lat - userLat) * 111;
      const dlng = (el.lon - userLng) * 111 * Math.cos(userLat * Math.PI / 180);
      const dist = (Math.sqrt(dlat*dlat + dlng*dlng) * 0.621).toFixed(1);
      return {
        name:      t.name || "Restaurant",
        address:   [t["addr:housenumber"], t["addr:street"], t["addr:city"]].filter(Boolean).join(" ") || "Address unavailable",
        rating:    t.stars ? parseFloat(t.stars) : parseFloat((3.5 + Math.random() * 1.4).toFixed(1)),
        priceRange:t.price_range || ["$","$$","$$$"][Math.floor(Math.random()*3)],
        cuisine:   t.cuisine ? t.cuisine.replace(/_/g," ") : restaurantCuisine,
        specialty: t.description || t.dish || "Chef's Special",
        hours:     t.opening_hours || "Hours not listed",
        phone:     t.phone || t["contact:phone"] || "",
        website:   t.website || t["contact:website"] || "",
        isOpen:    checkIsOpen(t.opening_hours),
        distance:  dist + " mi",
        lat: el.lat, lng: el.lon,
      };
    });
    setRestaurants(results);
    setRestaurantLoading(false);
  }


  const timeStr = time.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
  const dateStr = time.toLocaleDateString([],{weekday:"short",month:"short",day:"numeric"});

  return (
    <div style={{width:"100%",minHeight:"100dvh",minHeight:"-webkit-fill-available",background:T.bg,fontFamily:"'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",paddingTop:"env(safe-area-inset-top)",paddingBottom:"env(safe-area-inset-bottom)",paddingLeft:"env(safe-area-inset-left)",paddingRight:"env(safe-area-inset-right)",WebkitTapHighlightColor:"transparent",WebkitFontSmoothing:"antialiased",MozOsxFontSmoothing:"grayscale"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
        html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}
        body{overscroll-behavior-y:none;overscroll-behavior-x:none;-webkit-overflow-scrolling:touch}input,textarea,select{font-size:16px!important}
        ::-webkit-scrollbar{width:0;display:none}
        input,button,select,textarea{font-family:inherit;-webkit-appearance:none;appearance:none}
        input:focus,select:focus,textarea:focus{outline:none}
        button{-webkit-tap-highlight-color:transparent}
        @keyframes slideUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideInUp{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.45}}
        @keyframes popIn{from{opacity:0;transform:scale(0.85)}to{opacity:1;transform:scale(1)}}
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        @keyframes gentleBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}
        @keyframes heartbeatTrace{0%{stroke-dashoffset:1000}100%{stroke-dashoffset:0}}
        @keyframes heartbeatGlow{0%,100%{filter:drop-shadow(0 0 2px rgba(255,59,92,0.4))}50%{filter:drop-shadow(0 0 6px rgba(255,59,92,0.8))}}
        @keyframes neonPulse{0%,100%{text-shadow:0 0 4px #ff3b5c,0 0 11px #ff3b5c,0 0 19px #ff3b5c,0 0 40px #ff0044,0 0 80px #ff0044}50%{text-shadow:0 0 2px #ff3b5c,0 0 5px #ff3b5c,0 0 10px #ff3b5c,0 0 20px #ff0044,0 0 40px #ff0044}}
        @keyframes ecgSweep{0%{stroke-dashoffset:600}100%{stroke-dashoffset:0}}
      `}</style>

      {/* App Root */}
      <div style={{width:"100%",minHeight:"100dvh",background:T.bg,display:"flex",flexDirection:"column",overflow:"hidden"}}>

        {/* ─── ONBOARDING SCREENS ────────────────────────────────────────*/}
        {onboardingStep !== null && (
          <div style={{flex:1,display:"flex",flexDirection:"column",background:"#000",minHeight:"100dvh"}}>

            {/* SPLASH — Google Sign-in */}
            {onboardingStep === "splash" && (
              <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 24px",textAlign:"center",animation:"fadeIn 0.5s ease"}}>
                {/* App icon */}
                <div style={{width:120,height:120,borderRadius:32,background:"linear-gradient(135deg,#C084FC,#F472B6,#FB923C)",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:8,boxShadow:"0 8px 32px rgba(192,132,252,0.4)"}}>
                  <span style={{fontSize:52}}>❤️</span>
                </div>
                <div style={{width:24,height:24,borderRadius:12,background:"rgba(255,255,255,0.12)",display:"flex",alignItems:"center",justifyContent:"center",marginTop:-12,marginLeft:60,marginBottom:20}}>
                  <span style={{fontSize:11}}>🩶</span>
                </div>

                <h1 style={{fontSize:32,fontWeight:900,color:"#fff",letterSpacing:"-0.03em",marginBottom:8,fontFamily:"Georgia,serif"}}>PULSE</h1>
                <p style={{fontSize:14,color:"rgba(255,255,255,0.5)",marginBottom:48}}>Your family's heartbeat in one app.</p>

                {fwLoading ? (
                  <div style={{display:"flex",alignItems:"center",gap:10,padding:"16px 32px"}}>
                    <div style={{width:20,height:20,border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"#fff",borderRadius:10,animation:"pulse 0.8s linear infinite"}}/>
                    <span style={{fontSize:14,color:"rgba(255,255,255,0.6)"}}>Signing in...</span>
                  </div>
                ) : (
                  <div onClick={fwGoogleLogin} style={{background:"#fff",borderRadius:28,padding:"14px 36px",cursor:"pointer",display:"flex",alignItems:"center",gap:12,boxShadow:"0 4px 20px rgba(0,0,0,0.3)",transition:"transform 0.15s",minWidth:260,justifyContent:"center"}}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    <span style={{fontSize:15,fontWeight:700,color:"#333"}}>Continue with Google</span>
                  </div>
                )}

                {fwError && <p style={{fontSize:12,color:"#FF6B6B",marginTop:16}}>{fwError}</p>}
              </div>
            )}

            {/* ROLE SELECTION */}
            {onboardingStep === "role" && fwUser && (
              <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 24px",textAlign:"center",animation:"fadeIn 0.4s ease"}}>
                {fwUser.photo ? <img src={fwUser.photo} style={{width:64,height:64,borderRadius:32,marginBottom:16,border:"3px solid rgba(255,255,255,0.1)"}} alt=""/> : <div style={{width:64,height:64,borderRadius:32,background:"linear-gradient(135deg,#22C55E,#10B981)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,fontWeight:800,color:"#fff",marginBottom:16}}>{fwUser.name?.[0]}</div>}
                <h2 style={{fontSize:22,fontWeight:900,color:"#fff",marginBottom:4}}>Welcome, {fwUser.name?.split(" ")[0]}!</h2>
                <p style={{fontSize:13,color:"rgba(255,255,255,0.45)",marginBottom:20}}>How would you like to use Pulse?</p>

                {/* Gender Selection */}
                <div style={{display:"flex",gap:8,marginBottom:28,width:"100%",maxWidth:320}}>
                  {[{id:"male",label:"Male",emoji:"👨"},{id:"female",label:"Female",emoji:"👩"}].map(g=>(
                    <div key={g.id} onClick={()=>setOnboardingGender(g.id)} style={{flex:1,padding:"12px 8px",borderRadius:14,fontSize:13,fontWeight:700,cursor:"pointer",textAlign:"center",background:onboardingGender===g.id?"rgba(34,197,94,0.25)":"rgba(255,255,255,0.06)",border:`1px solid ${onboardingGender===g.id?"#22C55E":"rgba(255,255,255,0.1)"}`,color:onboardingGender===g.id?"#22C55E":"rgba(255,255,255,0.5)",transition:"all 0.15s"}}>{g.emoji} {g.label}</div>
                  ))}
                </div>

                {fwLoading ? (
                  <div style={{display:"flex",alignItems:"center",gap:10,padding:"16px 32px"}}>
                    <div style={{width:20,height:20,border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"#fff",borderRadius:10,animation:"pulse 0.8s linear infinite"}}/>
                    <span style={{fontSize:14,color:"rgba(255,255,255,0.6)"}}>Setting up...</span>
                  </div>
                ) : (
                  <div style={{display:"flex",flexDirection:"column",gap:14,width:"100%",maxWidth:320,opacity:onboardingGender?1:0.4,pointerEvents:onboardingGender?"auto":"none",transition:"opacity 0.2s"}}>
                    <div onClick={()=>onboardingSelectRole("head")} style={{background:"linear-gradient(135deg,#22C55E,#10B981)",borderRadius:18,padding:"20px",cursor:"pointer",textAlign:"left",boxShadow:"0 4px 16px rgba(34,197,94,0.3)"}}>
                      <div style={{fontSize:28,marginBottom:8}}>👑</div>
                      <div style={{fontSize:16,fontWeight:800,color:"#fff",marginBottom:4}}>I'm the Family Head</div>
                      <div style={{fontSize:12,color:"rgba(255,255,255,0.75)",lineHeight:1.5}}>Create a family workspace and invite your family members to join</div>
                    </div>
                    <div onClick={()=>onboardingSelectRole("member")} style={{background:"rgba(168,85,247,0.12)",border:"1px solid rgba(168,85,247,0.3)",borderRadius:18,padding:"20px",cursor:"pointer",textAlign:"left"}}>
                      <div style={{fontSize:28,marginBottom:8}}>👤</div>
                      <div style={{fontSize:16,fontWeight:800,color:"#fff",marginBottom:4}}>I'm a Family Member</div>
                      <div style={{fontSize:12,color:"rgba(255,255,255,0.5)",lineHeight:1.5}}>Join your family head's workspace automatically</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* FAMILY HEAD — Add members now or later */}
            {onboardingStep === "add_members" && fwUser && (
              <div style={{flex:1,display:"flex",flexDirection:"column",padding:"40px 24px",animation:"fadeIn 0.4s ease"}}>
                <div style={{textAlign:"center",marginBottom:32}}>
                  <div style={{fontSize:36,marginBottom:12}}>👨‍👩‍👧‍👦</div>
                  <h2 style={{fontSize:20,fontWeight:900,color:"#fff",marginBottom:6}}>Add Family Members</h2>
                  <p style={{fontSize:12,color:"rgba(255,255,255,0.45)"}}>Invite them by email so they can join your workspace</p>
                </div>

                <div style={{flex:1,overflowY:"auto"}}>
                  {onboardingAddEmails.map((email, i) => (
                    <div key={i} style={{marginBottom:14,animation:`slideUp 0.3s ease ${i*0.05}s both`}}>
                      <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:700,marginBottom:5}}>Member {i+1}</div>
                      <div style={{display:"flex",gap:8,marginBottom:6}}>
                        <input
                          value={onboardingAddNames[i]||""}
                          onChange={e=>{const n=[...onboardingAddNames];n[i]=e.target.value;setOnboardingAddNames(n);}}
                          placeholder="Name"
                          style={{flex:1,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:12,padding:"12px 14px",fontSize:14,color:"#fff",outline:"none",fontFamily:"inherit"}}
                        />
                        <input
                          value={email}
                          onChange={e=>{const n=[...onboardingAddEmails];n[i]=e.target.value;setOnboardingAddEmails(n);}}
                          placeholder="email@example.com"
                          type="email"
                          style={{flex:1.5,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:12,padding:"12px 14px",fontSize:14,color:"#fff",outline:"none",fontFamily:"inherit"}}
                        />
                      </div>
                      <div style={{display:"flex",gap:6,marginBottom:2}}>
                        {[{id:"male",label:"Male",emoji:"👨"},{id:"female",label:"Female",emoji:"👩"},{id:"boy",label:"Boy",emoji:"👦"},{id:"girl",label:"Girl",emoji:"👧"}].map(g=>(
                          <div key={g.id} onClick={()=>{const n=[...onboardingAddGenders];n[i]=g.id;setOnboardingAddGenders(n);}} style={{flex:1,padding:"8px 6px",borderRadius:10,fontSize:12,fontWeight:600,cursor:"pointer",textAlign:"center",background:onboardingAddGenders[i]===g.id?"rgba(34,197,94,0.25)":"rgba(255,255,255,0.06)",border:`1px solid ${onboardingAddGenders[i]===g.id?"#22C55E":"rgba(255,255,255,0.1)"}`,color:onboardingAddGenders[i]===g.id?"#22C55E":"rgba(255,255,255,0.5)",transition:"all 0.15s"}}>{g.emoji} {g.label}</div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div onClick={()=>{setOnboardingAddEmails(p=>[...p,""]);setOnboardingAddNames(p=>[...p,""]);setOnboardingAddGenders(p=>[...p,""]);}} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",padding:"10px 0",marginBottom:12}}>
                    <div style={{width:28,height:28,borderRadius:14,background:"rgba(34,197,94,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,color:"#22C55E"}}>+</div>
                    <span style={{fontSize:13,color:"#22C55E",fontWeight:600}}>Add another member</span>
                  </div>
                </div>

                <div style={{display:"flex",flexDirection:"column",gap:10,paddingTop:16}}>
                  {onboardingAddEmails.some(e => e.includes("@")) && (
                    <div onClick={onboardingInviting?null:onboardingInviteMembers} style={{background:"linear-gradient(135deg,#22C55E,#10B981)",borderRadius:16,padding:"16px",textAlign:"center",cursor:onboardingInviting?"default":"pointer",fontSize:15,fontWeight:800,color:"#fff",opacity:onboardingInviting?0.7:1}}>
                      {onboardingInviting ? "⏳ Inviting..." : "✅ Add Members & Continue"}
                    </div>
                  )}
                  <div onClick={()=>setOnboardingStep(null)} style={{background:"rgba(255,255,255,0.06)",borderRadius:16,padding:"16px",textAlign:"center",cursor:"pointer",fontSize:14,fontWeight:700,color:"rgba(255,255,255,0.6)"}}>
                    Skip — I'll add later in Settings
                  </div>
                </div>
              </div>
            )}

            {/* GENDER SELECTION (for returning users without gender) */}
            {onboardingStep === "gender" && fwUser && (
              <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 24px",textAlign:"center",animation:"fadeIn 0.4s ease"}}>
                {fwUser.photo ? <img src={fwUser.photo} style={{width:64,height:64,borderRadius:32,marginBottom:16,border:"3px solid rgba(255,255,255,0.1)"}} alt=""/> : <div style={{width:64,height:64,borderRadius:32,background:"linear-gradient(135deg,#22C55E,#10B981)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,fontWeight:800,color:"#fff",marginBottom:16}}>{fwUser.name?.[0]}</div>}
                <h2 style={{fontSize:22,fontWeight:900,color:"#fff",marginBottom:4}}>Welcome back, {fwUser.name?.split(" ")[0]}!</h2>
                <p style={{fontSize:13,color:"rgba(255,255,255,0.45)",marginBottom:28}}>Please select your gender to continue</p>
                <div style={{display:"flex",gap:12,width:"100%",maxWidth:300,marginBottom:20}}>
                  {[{id:"male",label:"Male",emoji:"👨"},{id:"female",label:"Female",emoji:"👩"}].map(g=>(
                    <div key={g.id} onClick={()=>setOnboardingGender(g.id)} style={{flex:1,padding:"20px 12px",borderRadius:18,fontSize:15,fontWeight:800,cursor:"pointer",textAlign:"center",background:onboardingGender===g.id?"rgba(34,197,94,0.25)":"rgba(255,255,255,0.06)",border:`2px solid ${onboardingGender===g.id?"#22C55E":"rgba(255,255,255,0.1)"}`,color:onboardingGender===g.id?"#22C55E":"rgba(255,255,255,0.5)",transition:"all 0.15s"}}>
                      <div style={{fontSize:36,marginBottom:8}}>{g.emoji}</div>
                      {g.label}
                    </div>
                  ))}
                </div>
                <div onClick={()=>{
                  if (!onboardingGender) return;
                  const updated = (fwMembers||[]).map(m => m.email === fwUser.email ? {...m, gender: onboardingGender} : m);
                  setFwMembers(updated);
                  // Persist to localStorage cache immediately so gender survives app restart
                  localStorage.setItem("pulse_fw_members_cache", JSON.stringify(updated));
                  if (fwWorkspace?.fileIds?.members && fwToken) {
                    fwWriteFile(fwWorkspace.fileIds.members, updated, fwToken).catch(()=>{});
                  }
                  setOnboardingStep(null);
                }} style={{background:onboardingGender?"linear-gradient(135deg,#22C55E,#10B981)":"rgba(255,255,255,0.1)",borderRadius:16,padding:"16px 48px",cursor:onboardingGender?"pointer":"default",fontSize:15,fontWeight:800,color:onboardingGender?"#fff":"rgba(255,255,255,0.3)",transition:"all 0.2s",boxShadow:onboardingGender?"0 4px 16px rgba(34,197,94,0.3)":"none"}}>Continue</div>
              </div>
            )}

            {/* FAMILY MEMBER — Waiting / Error */}
            {onboardingStep === "member_wait" && fwUser && (
              <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 24px",textAlign:"center",animation:"fadeIn 0.4s ease"}}>
                <div style={{fontSize:48,marginBottom:16}}>📨</div>
                <h2 style={{fontSize:20,fontWeight:900,color:"#fff",marginBottom:8}}>Not Registered Yet</h2>
                <p style={{fontSize:13,color:"rgba(255,255,255,0.5)",lineHeight:1.6,marginBottom:6,maxWidth:300}}>{onboardingMemberError}</p>
                <p style={{fontSize:12,color:"rgba(255,255,255,0.3)",marginBottom:32}}>Signed in as: {fwUser.email}</p>
                <div style={{display:"flex",flexDirection:"column",gap:10,width:"100%",maxWidth:280}}>
                  <div onClick={()=>{setOnboardingStep("role");}} style={{background:"rgba(255,255,255,0.08)",borderRadius:14,padding:"14px",textAlign:"center",cursor:"pointer",fontSize:13,fontWeight:700,color:"rgba(255,255,255,0.7)"}}>← Go Back</div>
                  <div onClick={fwSignOut} style={{borderRadius:14,padding:"14px",textAlign:"center",cursor:"pointer",fontSize:13,fontWeight:700,color:"#FF6B6B"}}>Sign Out</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── MAIN APP (only when onboarding complete) ─── */}
        {onboardingStep === null && (<>

        {/* ─── HOME SCREEN ────────────────────────────────────────*/}
        {mainTab === null && (
          <div style={{flex:1,display:"flex",flexDirection:"column",animation:"fadeIn 0.4s ease",background:isDark?T.bg:"#F2F2F7"}}>
            {/* Top Status Bar */}
            <div style={{padding:"12px 20px 0",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              {(() => {
                const estTime = time.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",hour12:true,timeZone:"America/New_York"});
                const secTime = time.toLocaleTimeString(secondCountry.locale,{hour:"2-digit",minute:"2-digit",hour12:true,timeZone:secondCountry.tz});
                const wEmoji = (w) => {
                  const c = w?.weathercode;
                  if (c == null) return "";
                  if (c === 0) return "☀️";
                  if (c === 1) return "🌤️";
                  if (c === 2) return "⛅";
                  if (c === 3) return "☁️";
                  if (c >= 51 && c <= 67) return "🌧️";
                  if (c >= 71 && c <= 77) return "❄️";
                  if (c >= 80 && c <= 82) return "🌦️";
                  if (c >= 95) return "⚡️";
                  return "⛅";
                };
                const cantonC = homeWeather?.temperature != null ? homeWeather.temperature : null;
                const secC    = hydWeather?.temperature  != null ? hydWeather.temperature  : null;
                return (
                  <div style={{display:"flex",alignItems:"center",gap:10,fontSize:10,marginLeft:"auto"}}>
                    <span style={{color:T.text,fontWeight:600}}>🇺🇸 {estTime} {cantonC!==null?`${wEmoji(homeWeather)} ${cantonC}°C`:""}</span>
                    <span style={{color:T.text,fontWeight:600}}>{secondCountry.flag} {secTime} {secC!==null?`${wEmoji(hydWeather)} ${secC}°C`:""}</span>
                  </div>
                );
              })()}
            </div>

            {/* Brand Header */}
            <div style={{padding:"16px 20px 12px",display:"flex",alignItems:"flex-end",justifyContent:"space-between"}}>
              <div>
                <h1 style={{fontSize:36,fontWeight:900,color:T.text,letterSpacing:"-0.01em",fontFamily:"Baskerville,'Baskerville Old Face','Hoefler Text','Times New Roman',serif",lineHeight:1,margin:0,display:"flex",alignItems:"center"}}>
                  PULSE
                  <svg width="28" height="28" viewBox="0 0 100 100" style={{marginLeft:8}}>
                    {/* Blue left half of heart */}
                    <path d="M50,88 C20,68 4,50 4,32 C4,16 16,4 32,4 C40,4 46,8 50,14" fill="none" stroke="#3B82F6" strokeWidth="10" strokeLinecap="round"/>
                    {/* Red right half of heart */}
                    <path d="M50,14 C54,8 60,4 68,4 C84,4 96,16 96,32 C96,50 80,68 50,88" fill="none" stroke="#FF3B5C" strokeWidth="10" strokeLinecap="round"/>
                    {/* ECG heartbeat line through the middle */}
                    <path d="M22,48 L36,48 L40,36 L46,60 L50,30 L54,56 L58,42 L62,48 L78,48" fill="none" stroke="#FF3B5C" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="120" strokeDashoffset="0" style={{animation:"ecgSweep 8s linear infinite"}}/>
                  </svg>
                </h1>
                <p style={{fontSize:11,fontWeight:600,color:T.textMuted,letterSpacing:"0.12em",fontFamily:"'SF Pro Display',system-ui,-apple-system,sans-serif",textTransform:"uppercase",marginTop:4}}>Your World, at a Glance</p>
              </div>
              <div style={{display:"flex",background:isDark?"rgba(255,255,255,0.1)":"rgba(0,0,0,0.06)",borderRadius:20,padding:3,gap:2}}>
                {[{key:"light",icon:(<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={!isDark?T.text:T.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>)},{key:"dark",icon:(<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isDark?T.text:T.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>)}].map(opt=>{
                  const active = isDark ? opt.key==="dark" : opt.key==="light";
                  return (
                    <div key={opt.key} onClick={()=>setThemeOverride(opt.key)}
                      style={{padding:"6px 10px",borderRadius:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
                        background:active?(isDark?"rgba(255,255,255,0.15)":"#fff"):"transparent",
                        boxShadow:active&&!isDark?"0 1px 3px rgba(0,0,0,0.1)":"none",
                        transition:"all 0.2s"}}>
                      {opt.icon}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Scrollable content */}
            <div style={{flex:1,overflowY:"auto",padding:"0 16px 100px",WebkitOverflowScrolling:"touch"}}>

              {/* 3-Column Tile Grid */}
              {(() => {
                const tileCardStyle = {
                  borderRadius:20,padding:"18px 10px 14px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
                  background:isDark?"rgba(255,255,255,0.06)":"#fff",
                  boxShadow:isDark?"none":"0 1px 4px rgba(0,0,0,0.06)",
                  border:isDark?"1px solid rgba(255,255,255,0.08)":"1px solid rgba(0,0,0,0.04)",
                  transition:"transform 0.15s ease, box-shadow 0.15s ease",WebkitTapHighlightColor:"transparent",position:"relative",minHeight:110
                };
                const iconWrap = (color, darkColor) => ({
                  width:44,height:44,borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:8,
                  background:isDark?darkColor:color
                });
                const titleStyle = {fontSize:13,fontWeight:800,color:T.text,textAlign:"center",marginBottom:2,letterSpacing:"-0.01em"};
                const subStyle = {fontSize:9,fontWeight:600,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.06em",textAlign:"center"};
                const badge = (bg, color, count) => count > 0 ? (
                  <div style={{position:"absolute",top:8,right:8,background:bg,borderRadius:10,padding:"1px 6px",fontSize:9,fontWeight:800,color:color,minWidth:18,textAlign:"center"}}>{count}</div>
                ) : null;

                return (
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginTop:4}}>

                    {/* Movies */}
                    <div onClick={()=>setMainTab("movies")} style={{...tileCardStyle,animation:"popIn 0.4s ease 0.1s both"}}>
                      <div style={iconWrap("rgba(107,114,128,0.08)","rgba(255,255,255,0.08)")}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={isDark?"#A0A0A0":"#6B7280"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/><line x1="17" y1="17" x2="22" y2="17"/></svg>
                      </div>
                      <div style={titleStyle}>Movies</div>
                      <div style={subStyle}>THEATER · OTT</div>
                    </div>

                    {/* Eats */}
                    <div onClick={()=>setMainTab("restaurants")} style={{...tileCardStyle,animation:"popIn 0.4s ease 0.15s both"}}>
                      <div style={iconWrap("rgba(234,179,8,0.10)","rgba(234,179,8,0.15)")}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={isDark?"#FACC15":"#D97706"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/></svg>
                      </div>
                      <div style={titleStyle}>Eats</div>
                      <div style={subStyle}>NEARBY</div>
                    </div>

                    {/* Grocery */}
                    <div onClick={()=>setMainTab("grocery")} style={{...tileCardStyle,animation:"popIn 0.4s ease 0.2s both"}}>
                      <div style={iconWrap("rgba(234,179,8,0.10)","rgba(234,179,8,0.15)")}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={isDark?"#FACC15":"#D97706"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                      </div>
                      <div style={titleStyle}>Grocery</div>
                      <div style={subStyle}>SHARED</div>
                    </div>

                    {/* Doctors */}
                    <div onClick={()=>setMainTab("doctor")} style={{...tileCardStyle,animation:"popIn 0.4s ease 0.25s both"}}>
                      <div style={iconWrap("rgba(107,114,128,0.08)","rgba(255,255,255,0.08)")}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={isDark?"#A0A0A0":"#6B7280"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/></svg>
                      </div>
                      <div style={titleStyle}>Doctors</div>
                      <div style={subStyle}>VISITS</div>
                    </div>

                    {/* To-Do */}
                    <div onClick={()=>setMainTab("todo")} style={{...tileCardStyle,animation:"popIn 0.4s ease 0.3s both"}}>
                      <div style={iconWrap("rgba(34,197,94,0.10)","rgba(34,197,94,0.15)")}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={isDark?"#4ADE80":"#16A34A"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                      </div>
                      <div style={titleStyle}>To-Do</div>
                      <div style={subStyle}>TASKS</div>
                    </div>

                    {/* Travel (Reservations) */}
                    <div onClick={()=>setMainTab("reservations")} style={{...tileCardStyle,animation:"popIn 0.4s ease 0.35s both"}}>
                      <div style={iconWrap("rgba(251,146,60,0.10)","rgba(251,146,60,0.15)")}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={isDark?"#FB923C":"#EA580C"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
                      </div>
                      <div style={titleStyle}>Travel</div>
                      <div style={subStyle}>BOOKINGS</div>
                    </div>

                    {/* Clothing */}
                    <div onClick={()=>setMainTab("clothing")} style={{...tileCardStyle,animation:"popIn 0.4s ease 0.4s both"}}>
                      <div style={iconWrap("rgba(244,63,94,0.10)","rgba(244,63,94,0.15)")}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={isDark?"#FB7185":"#E11D48"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/></svg>
                      </div>
                      <div style={titleStyle}>Clothing</div>
                      <div style={subStyle}>WISHLIST</div>
                    </div>

                    {/* Calc */}
                    <div onClick={()=>setMainTab("calc")} style={{...tileCardStyle,animation:"popIn 0.4s ease 0.45s both"}}>
                      <div style={iconWrap("rgba(107,114,128,0.08)","rgba(255,255,255,0.08)")}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={isDark?"#A0A0A0":"#6B7280"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="8" y2="10.01"/><line x1="12" y1="10" x2="12" y2="10.01"/><line x1="16" y1="10" x2="16" y2="10.01"/><line x1="8" y1="14" x2="8" y2="14.01"/><line x1="12" y1="14" x2="12" y2="14.01"/><line x1="16" y1="14" x2="16" y2="14.01"/><line x1="8" y1="18" x2="8" y2="18.01"/><line x1="12" y1="18" x2="12" y2="18.01"/><line x1="16" y1="18" x2="16" y2="18.01"/></svg>
                      </div>
                      <div style={titleStyle}>Calc</div>
                      <div style={subStyle}>TOOLS</div>
                    </div>

                    {/* PingMe */}
                    <div onClick={()=>setMainTab("ping")} style={{...tileCardStyle,animation:"popIn 0.4s ease 0.55s both"}}>
                      <div style={iconWrap("rgba(64,224,208,0.10)","rgba(64,224,208,0.15)")}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={isDark?"#40E0D0":"#20B2AA"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                      </div>
                      <div style={titleStyle}>PingMe</div>
                      <div style={subStyle}>SECURE</div>
                    </div>

                    {/* Period Calendar — only for female members */}
                    {(() => { const me = (fwMembers||[]).find(m=>m.email===fwUser?.email); return me?.gender === "female"; })() && (
                    <div onClick={()=>setMainTab("periodcal")} style={{...tileCardStyle,animation:"popIn 0.4s ease 0.6s both"}}>
                      <div style={iconWrap("rgba(236,72,153,0.10)","rgba(236,72,153,0.15)")}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={isDark?"#F472B6":"#DB2777"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M12 16a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" fill={isDark?"#F472B6":"#DB2777"}/></svg>
                      </div>
                      <div style={titleStyle}>PC</div>
                      <div style={subStyle}>TRACKER</div>
                    </div>
                    )}

                    {/* Contacts */}
                    <div onClick={()=>setMainTab("contacts")} style={{...tileCardStyle,animation:"popIn 0.4s ease 0.65s both"}}>
                      <div style={iconWrap("rgba(99,102,241,0.10)","rgba(99,102,241,0.15)")}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={isDark?"#A5B4FC":"#6366F1"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                      </div>
                      <div style={titleStyle}>Contacts</div>
                      <div style={subStyle}>DIRECTORY</div>
                    </div>

                    {/* Secure Folder */}
                    <div onClick={()=>setMainTab("securefolder")} style={{...tileCardStyle,animation:"popIn 0.4s ease 0.7s both"}}>
                      <div style={iconWrap("rgba(239,68,68,0.10)","rgba(239,68,68,0.15)")}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={isDark?"#FCA5A5":"#EF4444"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/><circle cx="12" cy="16" r="1"/></svg>
                      </div>
                      <div style={titleStyle}>Secure</div>
                      <div style={subStyle}>VAULT</div>
                    </div>

                    {/* Finance */}
                    <div onClick={()=>setMainTab("finance")} style={{...tileCardStyle,animation:"popIn 0.4s ease 0.75s both"}}>
                      <div style={iconWrap("rgba(34,197,94,0.10)","rgba(34,197,94,0.15)")}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={isDark?"#86EFAC":"#16A34A"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                      </div>
                      <div style={titleStyle}>Finance</div>
                      <div style={subStyle}>TRACKER</div>
                    </div>

                  </div>
                );
              })()}
            </div>

            {/* Bottom Navigation Bar */}
            <div style={{position:"fixed",bottom:0,left:0,right:0,background:isDark?"rgba(8,10,14,0.95)":"rgba(255,255,255,0.97)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",borderTop:`1px solid ${isDark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.08)"}`,display:"flex",alignItems:"center",justifyContent:"space-around",padding:"8px 0 max(env(safe-area-inset-bottom,8px),8px)",zIndex:100}}>
              {[
                {key:null,label:"Home",icon:<svg width="22" height="22" viewBox="0 0 24 24" fill={mainTab===null?(isDark?"#fff":"#000"):"none"} stroke={mainTab===null?(isDark?"#fff":"#000"):(isDark?"rgba(255,255,255,0.4)":"rgba(0,0,0,0.35)")} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>},
                {key:"movies",label:"Movies",icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={mainTab==="movies"?(isDark?"#fff":"#000"):(isDark?"rgba(255,255,255,0.4)":"rgba(0,0,0,0.35)")} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/><line x1="17" y1="17" x2="22" y2="17"/></svg>},
                {key:"grocery",label:"Shop",icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={mainTab==="grocery"?(isDark?"#fff":"#000"):(isDark?"rgba(255,255,255,0.4)":"rgba(0,0,0,0.35)")} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>},
                {key:"ping",label:"Chat",icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={mainTab==="ping"?(isDark?"#fff":"#000"):(isDark?"rgba(255,255,255,0.4)":"rgba(0,0,0,0.35)")} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>},
                {key:"settings",label:"Settings",icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={mainTab==="settings"?(isDark?"#fff":"#000"):(isDark?"rgba(255,255,255,0.4)":"rgba(0,0,0,0.35)")} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>}
              ].map(nav=>(
                <div key={nav.key||"home"} onClick={()=>setMainTab(nav.key)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,cursor:"pointer",padding:"2px 12px",WebkitTapHighlightColor:"transparent"}}>
                  {nav.icon}
                  <span style={{fontSize:9,fontWeight:mainTab===nav.key||(!mainTab&&!nav.key)?700:500,color:mainTab===nav.key||(!mainTab&&!nav.key)?T.text:T.textMuted}}>{nav.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}


        {/* ─── MOVIES SECTION ────────────────────────────────────────*/}
        {mainTab === "movies" && (
          <>
            {/* Header */}
            <div style={{padding:"14px 16px 0",flexShrink:0}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                <div onClick={goHome} style={{cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",width:36,height:36,borderRadius:18,background:isDark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.05)",flexShrink:0}} title="Back to Home">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={T.text} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                </div>
                <h2 style={{fontSize:18,fontWeight:900,color:T.text,letterSpacing:"-0.02em",margin:0}}>Movies</h2>
                <div style={{width:36}}/>
              </div>
              {/* Theater / OTT toggle */}
              <div style={{display:"flex",gap:0,background:isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.05)",borderRadius:12,padding:3,marginBottom:8}}>
                <button onClick={()=>setMovieTab("theater")}
                  style={{flex:1,padding:"10px 0",borderRadius:10,border:"none",cursor:"pointer",
                    background:movieTab==="theater"?(isDark?"rgba(255,255,255,0.12)":"#fff"):"transparent",
                    boxShadow:movieTab==="theater"&&!isDark?"0 1px 3px rgba(0,0,0,0.1)":"none",
                    color:movieTab==="theater"?T.text:T.textMuted,fontWeight:movieTab==="theater"?800:500,fontSize:13,
                    transition:"all 0.2s ease",WebkitTapHighlightColor:"transparent"}}>
                  Theater
                </button>
                <button onClick={()=>setMovieTab("ott")}
                  style={{flex:1,padding:"10px 0",borderRadius:10,border:"none",cursor:"pointer",
                    background:movieTab==="ott"?(isDark?"rgba(255,255,255,0.12)":"#fff"):"transparent",
                    boxShadow:movieTab==="ott"&&!isDark?"0 1px 3px rgba(0,0,0,0.1)":"none",
                    color:movieTab==="ott"?T.text:T.textMuted,fontWeight:movieTab==="ott"?800:500,fontSize:13,
                    transition:"all 0.2s ease",WebkitTapHighlightColor:"transparent"}}>
                  OTT
                </button>
              </div>
            </div>

            <div style={{flex:1,overflowY:"auto",padding:"10px 16px 100px",WebkitOverflowScrolling:"touch"}}>
              {movieTab === null && (
                <div style={{textAlign:"center",paddingTop:50,animation:"fadeIn 0.4s ease"}}>
                  <div style={{fontSize:52,marginBottom:16}}>🎬</div>
                  <p style={{fontSize:15,color:T.textMuted,lineHeight:1.7}}>Choose <span style={{color:"#FF6B35",fontWeight:700}}>Theater</span> for movies<br/>near you, or <span style={{color:"#7C3AED",fontWeight:700}}>OTT</span> for<br/>streaming releases.</p>
                </div>
              )}
              {movieTab === "theater" && (
                <>
                  {/* Location + Country pills */}
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                    <div style={{display:"flex",alignItems:"center",gap:5}}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      <span style={{fontSize:11,fontWeight:700,color:T.textMuted}}>{theaterCity || "Detecting…"}</span>
                      {theaterGeoLoading && <span style={{fontSize:9,color:"#FF6B35",fontWeight:700}}>Locating…</span>}
                      {!theaterGeoLoading && nearbyTheaters.length > 0 && <span style={{fontSize:9,color:"#22C55E",fontWeight:600}}>{nearbyTheaters.length} theaters</span>}
                    </div>
                    <div onClick={()=>{setNearbyTheaters([]);setTheaterCoords(null);setTheaterCity(null);setTheaterGeoError(null);setTmdbTheater({});}}
                      style={{cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",width:30,height:30,borderRadius:15,background:isDark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.05)"}}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                    </div>
                  </div>

                  {/* Country filter pills */}
                  <div style={{display:"flex",gap:8,overflowX:"auto",marginBottom:14,paddingBottom:4,WebkitOverflowScrolling:"touch",scrollbarWidth:"none"}}>
                    {[
                      {id:"american",label:"American",flag:"US"},
                      {id:"indian",  label:"Indian",  flag:"IN"},
                      {id:"british", label:"British", flag:"GB"},
                      {id:"korean",  label:"Korean",  flag:"KR"},
                      {id:"french",  label:"French",  flag:"FR"},
                      {id:"japanese",label:"Japanese",flag:"JP"},
                    ].map(c=>{
                      const active = c.id === theaterCountry;
                      return (
                        <button key={c.id} onClick={()=>setTheaterCountry(c.id)}
                          style={{flexShrink:0,padding:"8px 16px",borderRadius:24,border:"none",cursor:"pointer",
                            fontSize:12,fontWeight:active?700:500,
                            background:active?"#FF6B35":(isDark?"rgba(255,255,255,0.06)":"#fff"),
                            color:active?"#fff":T.text,
                            boxShadow:active?"0 2px 8px rgba(255,107,53,0.3)":(isDark?"none":"0 1px 3px rgba(0,0,0,0.06)"),
                            border:active?"none":(isDark?"1px solid rgba(255,255,255,0.08)":"1px solid rgba(0,0,0,0.06)"),
                            display:"flex",alignItems:"center",gap:6,
                            transition:"all 0.2s ease",WebkitTapHighlightColor:"transparent"}}>
                          <span style={{fontSize:9,fontWeight:700,opacity:active?1:0.5}}>{c.flag}</span>
                          <span>{c.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Now Playing label */}
                  {(() => {
                    const names = {american:"American",indian:"Indian",british:"British",korean:"Korean",french:"French",japanese:"Japanese"};
                    return (
                      <div style={{fontSize:11,fontWeight:700,color:T.textMuted,marginBottom:10,textTransform:"uppercase",letterSpacing:"0.05em"}}>
                        Now playing · {names[theaterCountry]}
                      </div>
                    );
                  })()}

                  {/* Loading */}
                  {tmdbLoading[theaterCountry] && [...Array(3)].map((_,i)=>(
                    <div key={i} style={{background:isDark?T.bgCard:"#fff",borderRadius:16,padding:"14px",marginBottom:12,boxShadow:isDark?"none":"0 1px 4px rgba(0,0,0,0.06)",border:isDark?`1px solid ${T.border}`:"1px solid rgba(0,0,0,0.04)",display:"flex",gap:12,animation:"pulse 1.5s ease-in-out infinite"}}>
                      <div style={{width:60,height:80,borderRadius:10,background:isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.06)",flexShrink:0}}/>
                      <div style={{flex:1}}>
                        <div style={{height:12,background:isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.05)",borderRadius:6,marginBottom:8,width:"50%"}}/>
                        <div style={{height:14,background:isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.05)",borderRadius:6,marginBottom:8,width:"80%"}}/>
                        <div style={{height:10,background:isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.05)",borderRadius:6,width:"60%"}}/>
                      </div>
                    </div>
                  ))}

                  {/* Error */}
                  {!tmdbLoading[theaterCountry] && tmdbError[theaterCountry] && (
                    <div style={{textAlign:"center",padding:"30px 0",color:T.textFaint,fontSize:12}}>
                      Could not load movies. Check connection and try again.
                    </div>
                  )}

                  {/* Movie cards */}
                  {!tmdbLoading[theaterCountry] && (tmdbTheater[theaterCountry]||[]).map((m,i)=>(
                    <TheaterMovieCard key={theaterCountry+"-"+i} movie={m} index={i} T={T} isDark={isDark}
                      onTap={(mv)=>{
                        // Inject current live theaters into movie for the detail view
                        const mv2 = nearbyTheaters.length > 0
                          ? {...mv, allTheaters: nearbyTheaters.map(th=>({...th, showTimes: th.showTimes||GENERIC_SHOWTIMES}))}
                          : mv;
                        setSelectedMovie(mv2);
                        setIsOTTMovie(false);
                      }}/>
                  ))}
                </>
              )}
              {movieTab === "ott" && (
                <>
                  {/* OTT category pills */}
                  <div style={{display:"flex",gap:8,marginBottom:12}}>
                    {OTT_CATEGORIES.map(c=>{
                      const active=c.id===ottCategory;
                      return <button key={c.id} onClick={()=>setOttCategory(c.id)} style={{flexShrink:0,padding:"8px 16px",borderRadius:24,border:"none",cursor:"pointer",fontSize:12,fontWeight:active?700:500,
                        background:active?"#7C3AED":(isDark?"rgba(255,255,255,0.06)":"#fff"),
                        color:active?"#fff":T.text,
                        boxShadow:active?"0 2px 8px rgba(124,58,237,0.3)":(isDark?"none":"0 1px 3px rgba(0,0,0,0.06)"),
                        border:active?"none":(isDark?"1px solid rgba(255,255,255,0.08)":"1px solid rgba(0,0,0,0.06)"),
                        transition:"all 0.2s",display:"flex",alignItems:"center",gap:5,WebkitTapHighlightColor:"transparent"}}>
                        <span>{c.flag}</span><span>{c.label} OTT</span>
                      </button>;
                    })}
                  </div>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                    <div style={{fontSize:11,fontWeight:700,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.05em"}}>
                      Trending · {(OTT_CATEGORIES.find(c=>c.id===ottCategory)||{}).label} streaming
                    </div>
                    <div onClick={()=>{setTmdbOTT(p=>({...p,[ottCategory]:null}));setTmdbError(p=>({...p,[`ott_${ottCategory}`]:false}));fetchOTTMovies(ottCategory);}}
                      style={{cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",width:30,height:30,borderRadius:15,background:isDark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.05)"}}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                    </div>
                  </div>
                  {tmdbLoading[`ott_${ottCategory}`] && [...Array(3)].map((_,i)=>(
                    <div key={i} style={{background:isDark?T.bgCard:"#fff",borderRadius:16,padding:"14px",marginBottom:12,boxShadow:isDark?"none":"0 1px 4px rgba(0,0,0,0.06)",border:isDark?`1px solid ${T.border}`:"1px solid rgba(0,0,0,0.04)",display:"flex",gap:12,animation:"pulse 1.5s ease-in-out infinite"}}>
                      <div style={{width:60,height:80,borderRadius:10,background:isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.06)",flexShrink:0}}/>
                      <div style={{flex:1}}>
                        <div style={{height:12,background:isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.05)",borderRadius:6,marginBottom:8,width:"50%"}}/>
                        <div style={{height:14,background:isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.05)",borderRadius:6,marginBottom:8,width:"80%"}}/>
                        <div style={{height:10,background:isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.05)",borderRadius:6,width:"60%"}}/>
                      </div>
                    </div>
                  ))}
                  {!tmdbLoading[`ott_${ottCategory}`] && tmdbError[`ott_${ottCategory}`] && (
                    <div style={{textAlign:"center",paddingTop:30}}>
                      <div style={{fontSize:13,color:T.textFaint,marginBottom:12}}>Could not load movies. Check your connection.</div>
                      <button onClick={()=>{setTmdbOTT(p=>({...p,[ottCategory]:null}));setTmdbError(p=>({...p,[`ott_${ottCategory}`]:false}));fetchOTTMovies(ottCategory);}} style={{padding:"8px 20px",borderRadius:20,border:"none",background:"#7C3AED",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>Retry</button>
                    </div>
                  )}
                  {!tmdbLoading[`ott_${ottCategory}`] && !tmdbError[`ott_${ottCategory}`] &&
                    (tmdbOTT[ottCategory]||[]).map((m,i)=>(
                      <OTTMovieCard key={`${ottCategory}-${i}`} movie={m} index={i} T={T} isDark={isDark} onTap={(mv)=>{setSelectedMovie(mv);setIsOTTMovie(true);}}/>
                    ))
                  }
                </>
              )}
            </div>
          </>
        )}

        {/* ─── RESTAURANTS SECTION ────────────────────────────────────────*/}
        {mainTab === "restaurants" && (
          <>
            {/* Header */}
            <div style={{padding:"14px 16px 0",flexShrink:0}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
                <div onClick={goHome} style={{cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",width:36,height:36,borderRadius:18,background:isDark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.05)",flexShrink:0}} title="Back to Home">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={T.text} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                </div>
                <div style={{textAlign:"center",flex:1}}>
                  <h2 style={{fontSize:18,fontWeight:900,color:T.text,margin:0,letterSpacing:"-0.02em"}}>Nearby Eats</h2>
                  <div style={{fontSize:10,color:T.textMuted,fontWeight:600,marginTop:2,textTransform:"uppercase",letterSpacing:"0.05em"}}>{userCity || "Detecting location…"}</div>
                </div>
                <div onClick={()=>{
                  setRestaurants([]); setUserCoords(null); setUserCity(null); setRestaurantError(null); setRestaurantLoading(true);
                  navigator.geolocation?.getCurrentPosition(
                    pos=>{
                      const c={lat:pos.coords.latitude,lng:pos.coords.longitude};setUserCoords(c);
                      fetch(`https://nominatim.openstreetmap.org/reverse?lat=${c.lat}&lon=${c.lng}&format=json&zoom=10`).then(r=>r.json()).then(d=>{const city=d.address?.city||d.address?.town||d.address?.village||"Your Location";const st=d.address?.state?`, ${d.address.state.replace(/^(.{2}).*/,"$1").toUpperCase()}`:"";setUserCity(`${city}${st}`);}).catch(()=>setUserCity("Your Location"));
                      fetchNearby(c.lat,c.lng,restaurantCuisine);
                    },
                    ()=>{const d={lat:42.3098,lng:-83.4827};setUserCoords(d);setUserCity("Canton, MI");fetchNearby(d.lat,d.lng,restaurantCuisine);},
                    {timeout:5000}
                  );
                }} style={{cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",width:36,height:36,borderRadius:18,background:isDark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.05)"}}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                </div>
              </div>
            </div>

            {/* Cuisine Tabs */}
            <div style={{padding:"10px 16px 12px",flexShrink:0}}>
              <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:4,WebkitOverflowScrolling:"touch",scrollbarWidth:"none",msOverflowStyle:"none"}}>
                {[
                  {id:"american",label:"American",flag:"US"},
                  {id:"indian",label:"Indian",flag:"IN"},
                  {id:"italian",label:"Italian",flag:"IT"},
                  {id:"chinese",label:"Chinese",flag:"CN"},
                  {id:"mexican",label:"Mexican",flag:"MX"},
                  {id:"japanese",label:"Japanese",flag:"JP"}
                ].map(cu=>{
                  const active = cu.id === restaurantCuisine;
                  return (
                    <button key={cu.id} onClick={()=>setRestaurantCuisine(cu.id)}
                      style={{
                        flexShrink:0,padding:"8px 16px",borderRadius:24,border:"none",cursor:"pointer",
                        fontSize:12,fontWeight:active?700:500,letterSpacing:"0.01em",
                        background:active?"#22C55E":(isDark?"rgba(255,255,255,0.06)":"#fff"),
                        color:active?"#fff":T.text,
                        boxShadow:active?"0 2px 8px rgba(34,197,94,0.3)":(isDark?"none":"0 1px 3px rgba(0,0,0,0.06)"),
                        border:active?"none":(isDark?"1px solid rgba(255,255,255,0.08)":`1px solid rgba(0,0,0,0.06)`),
                        display:"flex",alignItems:"center",gap:6,
                        transition:"all 0.2s ease",WebkitTapHighlightColor:"transparent"
                      }}>
                      <span style={{fontSize:9,fontWeight:700,opacity:active?1:0.5}}>{cu.flag}</span>
                      <span>{cu.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Restaurant List */}
            <div style={{flex:1,overflowY:"auto",padding:"0 16px 100px",WebkitOverflowScrolling:"touch"}}>
              {/* Loading Skeletons */}
              {restaurantLoading && [...Array(4)].map((_,i)=>(
                <div key={i} style={{background:isDark?T.bgCard:"#fff",borderRadius:16,padding:"16px",marginBottom:12,boxShadow:isDark?"none":"0 1px 4px rgba(0,0,0,0.06)",border:isDark?`1px solid ${T.border}`:"1px solid rgba(0,0,0,0.04)",animation:"pulse 1.5s ease-in-out infinite"}}>
                  <div style={{height:14,background:isDark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.06)",borderRadius:6,marginBottom:10,width:"55%"}}/>
                  <div style={{height:10,background:isDark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.04)",borderRadius:6,marginBottom:8,width:"75%"}}/>
                  <div style={{height:10,background:isDark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.04)",borderRadius:6,width:"35%"}}/>
                </div>
              ))}

              {/* Error State */}
              {!restaurantLoading && restaurantError && restaurantError !== "__SHOW_SEARCH__" && restaurantError !== "__LOCATING__" && (
                <div style={{textAlign:"center",paddingTop:60}}>
                  <div style={{fontSize:40,marginBottom:12}}>😭</div>
                  <div style={{fontSize:13,color:T.textMuted,marginBottom:20}}>{restaurantError}</div>
                  <div onClick={()=>{const d={lat:42.3098,lng:-83.4827};setUserCoords(d);setUserCity("Canton, MI");setRestaurantError(null);fetchNearby(d.lat,d.lng,restaurantCuisine);}} style={{display:"inline-block",background:"#22C55E",borderRadius:14,padding:"11px 22px",cursor:"pointer",fontSize:13,fontWeight:700,color:"#fff"}}>Try Again</div>
                </div>
              )}

              {/* Empty State */}
              {!restaurantLoading && !restaurantError && restaurants.length===0 && (
                <div style={{textAlign:"center",paddingTop:60}}>
                  <div style={{fontSize:40,marginBottom:12}}>🍽️</div>
                  <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:6}}>No restaurants found</div>
                  <div style={{fontSize:12,color:T.textFaint}}>Try a different cuisine or refresh your location</div>
                </div>
              )}

              {/* Restaurant Cards */}
              {!restaurantLoading && !restaurantError && restaurants.map((r,i)=>(
                <div key={i} style={{background:isDark?T.bgCard:"#fff",borderRadius:16,padding:"16px",marginBottom:12,boxShadow:isDark?"none":"0 1px 4px rgba(0,0,0,0.06)",border:isDark?`1px solid ${T.border}`:"1px solid rgba(0,0,0,0.04)",animation:`slideUp 0.3s ease ${i*0.05}s both`}}>
                  {/* Name + Status + Rating */}
                  <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:8}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}>
                        <h3 style={{fontSize:15,fontWeight:800,color:T.text,margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.name}</h3>
                        <span style={{flexShrink:0,display:"inline-flex",alignItems:"center",gap:3,fontSize:9,fontWeight:800,
                          color: r.isOpen===true?"#22C55E":r.isOpen===false?"#EF4444":"#9CA3AF",
                          background: r.isOpen===true?"rgba(34,197,94,0.1)":r.isOpen===false?"rgba(239,68,68,0.1)":"rgba(156,163,175,0.1)",
                          padding:"3px 8px",borderRadius:20}}>
                          <span style={{width:6,height:6,borderRadius:3,background:r.isOpen===true?"#22C55E":r.isOpen===false?"#EF4444":"#9CA3AF"}}/>
                          {r.isOpen===true?"OPEN":r.isOpen===false?"CLOSED":"HRS?"}
                        </span>
                      </div>
                      <div style={{fontSize:11,color:T.textMuted,marginTop:2}}>{r.cuisine} · {r.priceRange}</div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:3,flexShrink:0,marginLeft:8}}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="#FACC15" stroke="#FACC15" strokeWidth="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                      <span style={{fontSize:14,fontWeight:800,color:T.text}}>{r.rating}</span>
                    </div>
                  </div>

                  {/* Address + Distance */}
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                    <div style={{display:"flex",alignItems:"center",gap:5,flex:1,minWidth:0}}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      <span style={{fontSize:11,color:T.textMuted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.address}</span>
                    </div>
                    {r.distance && <span style={{fontSize:11,fontWeight:700,color:"#22C55E",flexShrink:0,marginLeft:8}}>{r.distance}</span>}
                  </div>

                  {/* Action Buttons */}
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <a href={`https://maps.google.com/?q=${encodeURIComponent(r.name+" "+r.address)}`} target="_blank" rel="noopener noreferrer" style={{flex:1,textDecoration:"none"}}>
                      <div style={{background:"#22C55E",borderRadius:12,padding:"10px",display:"flex",alignItems:"center",justifyContent:"center",gap:6,cursor:"pointer",minHeight:42}}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        <span style={{fontSize:13,fontWeight:700,color:"#fff"}}>Maps</span>
                      </div>
                    </a>
                    {r.phone && (
                      <a href={`tel:${r.phone.replace(/\D/g,"")}`} style={{textDecoration:"none"}}>
                        <div style={{width:42,height:42,borderRadius:12,background:isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.04)",border:isDark?`1px solid ${T.border}`:"1px solid rgba(0,0,0,0.06)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                        </div>
                      </a>
                    )}
                    {r.website && (
                      <a href={r.website} target="_blank" rel="noopener noreferrer" style={{textDecoration:"none"}}>
                        <div style={{width:42,height:42,borderRadius:12,background:isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.04)",border:isDark?`1px solid ${T.border}`:"1px solid rgba(0,0,0,0.06)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                        </div>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ─── GROCERY SCREEN ────────────────────────────────────────*/}
        {mainTab === "grocery" && (
          <>
            <div style={{padding:"14px 16px 8px",borderBottom:`1px solid ${T.border}`,flexShrink:0}}>
              {/* Header */}
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                <div onClick={goHome} style={{cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",width:36,height:36,borderRadius:18,background:isDark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.05)",flexShrink:0,transition:"background 0.15s ease"}} title="Back to Home"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={T.textMuted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg></div>
                <div>
                  <h2 style={{fontSize:22,fontWeight:900,color:T.text,fontFamily:"Georgia,serif",letterSpacing:"-0.02em",margin:0}}>🛒 Grocery List</h2>
                  <div style={{fontSize:11,color:T.textFaint,marginTop:2}}>
                    {groceryItems.filter(i=>!i.done).length} remaining · {groceryItems.filter(i=>i.done).length} done
                  </div>
                </div>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                {groceryItems.some(i=>i.done) && (
                  <div onClick={clearDoneItems} style={{fontSize:11,fontWeight:700,color:"#FF3B5C",cursor:"pointer",background:"rgba(255,59,92,0.1)",padding:"6px 12px",borderRadius:20}}>
                    Clear Done
                  </div>
                )}
                </div>
              </div>

              {/* Add item input — shown in header only when All is selected */}
              {groceryStore === "all" && (
              <div style={{display:"flex",gap:8,marginBottom:10}}>
                <input
                  value={groceryInput}
                  onChange={e=>setGroceryInput(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&addGroceryItem()}
                  placeholder="Select a store below to add items"
                  disabled
                  style={{
                    flex:1,background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:14,
                    padding:"11px 14px",fontSize:13,color:T.textFaint,outline:"none",
                    fontFamily:"inherit",opacity:0.6,cursor:"not-allowed",
                  }}
                />
              </div>
              )}

              {/* Store filter pills */}
              <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:10,alignItems:"center"}}>
                {groceryStores.map(s=>{
                  const active = groceryStore === s.id;
                  return (
                    <div key={s.id} style={{flexShrink:0,display:"flex",alignItems:"center",gap:3,padding:"5px 10px",borderRadius:20,cursor:"pointer",fontSize:11,fontWeight:active?700:500,background:active?s.color:(isDark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.05)"),color:active?"#fff":T.textMuted,transition:"all 0.15s",border:active?`1px solid ${s.color}`:"1px solid transparent"}}>
                      <span onClick={()=>setGroceryStore(s.id)}>{s.emoji} {s.label}</span>
                      {s.id !== "all" && <span onClick={()=>removeGroceryStore(s.id)} style={{fontSize:9,opacity:0.6,marginLeft:2,cursor:"pointer"}}>❌</span>}
                    </div>
                  );
                })}
                {/* Add store */}
                {showAddStore ? (
                  <div style={{display:"flex",gap:4,flexShrink:0,alignItems:"center"}}>
                    <input autoFocus value={newStoreInput} onChange={e=>setNewStoreInput(e.target.value)}
                      onKeyDown={e=>e.key==="Enter"&&addGroceryStore()}
                      placeholder="Store name…" style={{width:90,background:T.bgInput,border:"1px solid #FFB800",borderRadius:20,padding:"5px 10px",fontSize:11,color:T.text,outline:"none"}}/>
                    <div onClick={addGroceryStore} style={{padding:"5px 10px",borderRadius:20,background:"#FFB800",color:"#000",fontSize:11,fontWeight:800,cursor:"pointer",flexShrink:0}}>✔</div>
                    <div onClick={()=>{setShowAddStore(false);setNewStoreInput("");}} style={{padding:"5px 8px",borderRadius:20,background:isDark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.05)",color:T.textMuted,fontSize:11,cursor:"pointer",flexShrink:0}}>❌</div>
                  </div>
                ) : (
                  <div onClick={()=>setShowAddStore(true)} style={{flexShrink:0,padding:"5px 10px",borderRadius:20,cursor:"pointer",fontSize:11,fontWeight:600,background:isDark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.05)",color:T.textMuted,border:`1px dashed ${T.border}`}}>+ Store</div>
                )}
              </div>

              {/* Contextual add input — shown when a specific store is selected */}
              {groceryStore !== "all" && (() => {
                const store = groceryStores.find(s => s.id === groceryStore);
                return (
                  <div style={{marginBottom:10,background:isDark?`${store.color}12`:`${store.color}10`,border:`1px solid ${store.color}40`,borderRadius:16,padding:"12px 14px"}}>
                    <div style={{fontSize:10,fontWeight:700,color:store.color,marginBottom:8,letterSpacing:"0.05em",textTransform:"uppercase"}}>
                      {store.emoji} Adding to {store.label}
                    </div>
                    <div style={{display:"flex",gap:8}}>
                      <input
                        value={groceryInput}
                        onChange={e=>setGroceryInput(e.target.value)}
                        onKeyDown={e=>e.key==="Enter"&&addGroceryItem()}
                        placeholder={`e.g. Milk, Bread, Eggs…`}
                        style={{
                          flex:1,background:isDark?"rgba(255,255,255,0.07)":"rgba(255,255,255,0.9)",
                          border:`1px solid ${store.color}50`,borderRadius:12,
                          padding:"12px 14px",fontSize:14,color:T.text,outline:"none",
                          fontFamily:"inherit",minHeight:48,
                        }}
                      />
                      <div onClick={addGroceryItem} style={{
                        background:store.color,borderRadius:14,padding:"12px 18px",cursor:"pointer",
                        fontSize:20,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,minHeight:48,minWidth:48,
                      }}>➕</div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Items list */}
            <div style={{flex:1,overflowY:"auto",padding:"10px 14px 16px",WebkitOverflowScrolling:"touch"}}>
              {groceryLoading && (
                <div style={{textAlign:"center",paddingTop:40}}>
                  <div style={{fontSize:32,marginBottom:8}}>🛒</div>
                  <div style={{fontSize:14,color:T.textFaint}}>Loading family list…</div>
                </div>
              )}

              {!groceryLoading && groceryItems.length === 0 && (
                <div style={{textAlign:"center",paddingTop:50}}>
                  <div style={{fontSize:52,marginBottom:12}}>🛒</div>
                  <div style={{fontSize:16,fontWeight:700,color:T.text,marginBottom:6}}>List is empty</div>
                  <div style={{fontSize:13,color:T.textFaint}}>Add your first item above</div>
                </div>
              )}

              {/* Group by: pending first, done at bottom */}
              {(() => {
                const filtered = groceryStore === "all"
                  ? groceryItems
                  : groceryItems.filter(i => i.store === groceryStore);
                const pending = filtered.filter(i => !i.done);
                const done    = filtered.filter(i => i.done);
                const storeColor = groceryStores.find(s => s.id === groceryStore)?.color || "#FFB800";

                return (
                  <>
                    {pending.map((item, i) => {
                      const itemStore = groceryStores.find(s => s.id === item.store);
                      const iColor = itemStore?.color || "#FFB800";
                      return (
                        <div key={item.id} style={{
                          display:"flex",alignItems:"center",gap:12,
                          background:T.bgCard,borderRadius:16,padding:"13px 14px",
                          marginBottom:8,border:`1px solid ${T.border}`,
                          borderLeft:`3px solid ${iColor}`,
                          animation:`slideUp 0.25s ease ${i*0.04}s both`,
                        }}>
                          <div onClick={()=>toggleGroceryItem(item.id, item.done)} style={{
                            width:24,height:24,borderRadius:8,border:`2px solid ${iColor}`,
                            display:"flex",alignItems:"center",justifyContent:"center",
                            cursor:"pointer",flexShrink:0,background:"transparent",
                          }}/>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:14,fontWeight:600,color:T.text}}>{item.text}</div>
                            <div style={{fontSize:10,color:T.textFaint,marginTop:2}}>{itemStore?.emoji} {item.store || "Walmart"}</div>
                          </div>
                          <div onClick={()=>deleteGroceryItem(item.id)} style={{fontSize:16,cursor:"pointer",color:T.textFaint,padding:"4px",flexShrink:0}}>❌</div>
                        </div>
                      );
                    })}

                    {done.length > 0 && (
                      <>
                        <div style={{fontSize:10,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:700,margin:"16px 0 8px 4px"}}>
                          ✔ Done ({done.length})
                        </div>
                        {done.map((item, i) => {
                          const itemStore = groceryStores.find(s => s.id === item.store);
                          return (
                          <div key={item.id} style={{
                            display:"flex",alignItems:"center",gap:12,
                            background:isDark?"rgba(255,255,255,0.02)":"rgba(0,0,0,0.03)",
                            borderRadius:16,padding:"12px 14px",marginBottom:8,
                            border:`1px solid ${T.border}`,opacity:0.6,
                          }}>
                            <div onClick={()=>toggleGroceryItem(item.id, item.done)} style={{
                              width:24,height:24,borderRadius:8,background:itemStore?.color||"#FFB800",
                              display:"flex",alignItems:"center",justifyContent:"center",
                              cursor:"pointer",flexShrink:0,fontSize:13,color:"#fff",fontWeight:800,
                            }}>✔</div>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontSize:14,fontWeight:500,color:T.textMuted,textDecoration:"line-through"}}>{item.text}</div>
                              <div style={{fontSize:10,color:T.textFaint,marginTop:2}}>{itemStore?.emoji} {item.store || "Walmart"}</div>
                            </div>
                            <div onClick={()=>deleteGroceryItem(item.id)} style={{fontSize:16,cursor:"pointer",color:T.textFaint,padding:"4px",flexShrink:0}}>❌</div>
                          </div>
                          );
                        })}
                      </>
                    )}

                    {/* Firebase note */}
                    <div style={{textAlign:"center",marginTop:20,padding:"12px",background:isDark?"rgba(255,184,0,0.07)":"rgba(255,184,0,0.08)",borderRadius:16,border:`1px solid rgba(255,184,0,0.2)`}}>
                      <div style={{fontSize:11,color:T.textFaint,lineHeight:1.6}}>
                        ☁️ <strong style={{color:"#FFB800"}}>Real-time sync</strong> — changes appear instantly on all family members' phones
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>


          </>
        )}

        {/* ─── DOCTOR APPOINTMENTS SCREEN ────────────────────────────────────────*/}
        {mainTab === "doctor" && (
          <>
            <div style={{padding:"14px 16px 10px",borderBottom:`1px solid ${T.border}`,flexShrink:0}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                <div onClick={goHome} style={{cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",width:36,height:36,borderRadius:18,background:isDark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.05)",flexShrink:0,transition:"background 0.15s ease"}} title="Back to Home"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={T.textMuted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg></div>
                <div>
                  <h2 style={{fontSize:22,fontWeight:900,color:T.text,fontFamily:"Georgia,serif",letterSpacing:"-0.02em",margin:0}}>🩺 Appointments</h2>
                  <div style={{fontSize:11,color:T.textFaint,marginTop:2}}>
                    {apptItems.filter(a=>!a.done).length} upcoming · {apptItems.filter(a=>a.done).length} past
                  </div>
                </div>
                <div style={{display:"flex",gap:6}}>
                  <div onClick={apptSyncing?undefined:syncGmailAppointments} style={{background:apptSyncing?"rgba(0,190,255,0.15)":"linear-gradient(135deg,#4CAF50,#2E7D32)",borderRadius:14,padding:"9px 12px",cursor:apptSyncing?"wait":"pointer",fontSize:12,fontWeight:700,color:apptSyncing?T.textMuted:"#fff",display:"flex",alignItems:"center",gap:4}}>
                    {apptSyncing ? <span style={{animation:"spin 1s linear infinite",display:"inline-block"}}>⏳</span> : "📧"} Sync
                  </div>
                  <div onClick={()=>{setApptForm({doctor:DOCTOR_TYPES[0],doctorName:"",address:"",member:familyMembers[0]||"",date:"",time:"",notes:""});setShowApptForm(true);}} style={{background:"linear-gradient(135deg,#00BEFF,#0080CC)",borderRadius:14,padding:"9px 16px",cursor:"pointer",fontSize:13,fontWeight:700,color:"#fff"}}>
                    + Add
                  </div>
                </div>
              </div>

              {/* Family member filter + Add Member */}
              <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:4,alignItems:"center"}}>
                {["All", ...familyMembers].map(m => {
                  const active = apptFilterMember === m;
                  return (
                    <div key={m} onClick={()=>setApptFilterMember(m)} style={{flexShrink:0,display:"flex",alignItems:"center",gap:4,padding:"5px 12px",borderRadius:20,cursor:"pointer",fontSize:11,fontWeight:active?700:500,background:active?"#00BEFF":(isDark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.05)"),color:active?"#000":T.textMuted,transition:"all 0.15s"}}>
                      👤 {m}
                    </div>
                  );
                })}
              </div>
              {apptSyncMsg && (
                <div style={{padding:"6px 12px",margin:"4px 0 0",fontSize:11,fontWeight:600,color:apptSyncMsg.startsWith("✅")?"#22C55E":apptSyncMsg.startsWith("⚠")?"#FFB800":"#00BEFF",textAlign:"center"}}>
                  {apptSyncMsg}
                </div>
              )}
            </div>
            {showApptForm && (
              <div style={{position:"absolute",inset:0,zIndex:200,background:isDark?"rgba(0,0,0,0.7)":"rgba(0,0,0,0.4)",display:"flex",flexDirection:"column",justifyContent:"flex-end"}} onClick={()=>setShowApptForm(false)}>
                <div style={{background:isDark?"#13151A":"#fff",borderRadius:"24px 24px 0 0",padding:"20px 18px 36px",border:`1px solid ${T.border}`}} onClick={e=>e.stopPropagation()}>
                  <div style={{width:36,height:4,background:isDark?"rgba(255,255,255,0.2)":"rgba(0,0,0,0.15)",borderRadius:2,margin:"0 auto 16px"}}/>
                  <div style={{fontSize:15,fontWeight:800,color:T.text,marginBottom:14}}>🩺 New Appointment</div>

                  {/* Doctor type */}
                  <div style={{fontSize:11,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.07em",fontWeight:700,marginBottom:6}}>Doctor / Type</div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
                    {DOCTOR_TYPES.map(d=>(
                      <div key={d} onClick={()=>setApptForm(f=>({...f,doctor:d}))} style={{padding:"8px 12px",borderRadius:20,fontSize:12,fontWeight:600,cursor:"pointer",minHeight:36,display:"flex",alignItems:"center",background:apptForm.doctor===d?"#00BEFF":(isDark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.06)"),color:apptForm.doctor===d?"#000":T.textMuted}}>{d}</div>
                    ))}
                  </div>

                  {/* Family member */}
                  <div style={{fontSize:11,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.07em",fontWeight:700,marginBottom:6}}>Family Member</div>
                  <div style={{display:"flex",gap:6,marginBottom:12}}>
                    {familyMembers.map(m=>(
                      <div key={m} onClick={()=>setApptForm(f=>({...f,member:m}))} style={{padding:"8px 14px",borderRadius:20,fontSize:12,fontWeight:600,cursor:"pointer",minHeight:36,display:"flex",alignItems:"center",background:apptForm.member===m?"#00BEFF":(isDark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.06)"),color:apptForm.member===m?"#000":T.textMuted}}>{m}</div>
                    ))}
                  </div>

                  {/* Doctor name */}
                  <div style={{fontSize:11,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.07em",fontWeight:700,marginBottom:6}}>Doctor Name</div>
                  <input value={apptForm.doctorName} onChange={e=>setApptForm(f=>({...f,doctorName:e.target.value}))} placeholder="e.g. Dr. Smith" style={{width:"100%",background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:12,padding:"12px 14px",fontSize:14,color:T.text,outline:"none",fontFamily:"inherit",marginBottom:12,boxSizing:"border-box",minHeight:48}}/>

                  {/* Address */}
                  <div style={{fontSize:11,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.07em",fontWeight:700,marginBottom:6}}>Clinic / Hospital Address</div>
                  <input value={apptForm.address} onChange={e=>setApptForm(f=>({...f,address:e.target.value}))} placeholder="e.g. 123 Main St, Canton, MI" style={{width:"100%",background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:12,padding:"12px 14px",fontSize:14,color:T.text,outline:"none",fontFamily:"inherit",marginBottom:12,boxSizing:"border-box",minHeight:48}}/>

                  {/* Date & Time */}
                  <div style={{display:"flex",gap:8,marginBottom:12}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:11,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.07em",fontWeight:700,marginBottom:6}}>Date</div>
                      <input type="date" value={apptForm.date} onChange={e=>setApptForm(f=>({...f,date:e.target.value}))} style={{width:"100%",background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:12,padding:"12px 14px",fontSize:14,color:T.text,outline:"none",fontFamily:"inherit",minHeight:48}}/>
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:11,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.07em",fontWeight:700,marginBottom:6}}>Time</div>
                      <input type="time" value={apptForm.time} onChange={e=>setApptForm(f=>({...f,time:e.target.value}))} style={{width:"100%",background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:12,padding:"12px 14px",fontSize:14,color:T.text,outline:"none",fontFamily:"inherit",minHeight:48}}/>
                    </div>
                  </div>

                  {/* Notes */}
                  <div style={{fontSize:11,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.07em",fontWeight:700,marginBottom:6}}>Notes (optional)</div>
                  <input value={apptForm.notes} onChange={e=>setApptForm(f=>({...f,notes:e.target.value}))} placeholder="e.g. Annual checkup, bring insurance card…" style={{width:"100%",background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:12,padding:"12px 14px",fontSize:14,color:T.text,outline:"none",fontFamily:"inherit",marginBottom:16,boxSizing:"border-box",minHeight:48}}/>

                  <div onClick={saveAppt} style={{background:"linear-gradient(135deg,#00BEFF,#0080CC)",borderRadius:16,padding:"16px",textAlign:"center",cursor:"pointer",fontSize:15,fontWeight:800,color:"#fff",minHeight:52}}>
                    💾 Save Appointment
                  </div>
                </div>
              </div>
            )}

            {/* Appointments list */}
            <div style={{flex:1,overflowY:"auto",padding:"10px 14px 16px",WebkitOverflowScrolling:"touch"}}>
              {apptLoading && (
                <div style={{textAlign:"center",paddingTop:40}}>
                  <div style={{fontSize:32,marginBottom:8}}>🩺</div>
                  <div style={{fontSize:14,color:T.textFaint}}>Loading appointments…</div>
                </div>
              )}
              {!apptLoading && apptItems.length === 0 && (
                <div style={{textAlign:"center",paddingTop:50}}>
                  <div style={{fontSize:52,marginBottom:12}}>🏥</div>
                  <div style={{fontSize:16,fontWeight:700,color:T.text,marginBottom:6}}>No appointments yet</div>
                  <div style={{fontSize:13,color:T.textFaint,marginBottom:20}}>Tap + Add or 📧 Sync from Gmail</div>
                  <div onClick={()=>{setApptForm({doctor:DOCTOR_TYPES[0],doctorName:"",address:"",member:familyMembers[0]||"",date:"",time:"",notes:""});setShowApptForm(true);}} style={{display:"inline-block",background:"linear-gradient(135deg,#00BEFF,#0080CC)",borderRadius:16,padding:"12px 24px",cursor:"pointer",fontSize:13,fontWeight:700,color:"#fff"}}>+ Add Appointment</div>
                </div>
              )}
              {(() => {
                const filterM = apptFilterMember;
                const filtered = filterM === "All" ? apptItems : apptItems.filter(a => a.member === filterM);
                const upcoming = filtered.filter(a => !a.done);
                const past     = filtered.filter(a => a.done);
                return (
                  <>
                    {upcoming.map((a, i) => (
                      <div key={a.id} style={{background:T.bgCard,borderRadius:18,padding:"14px 16px",marginBottom:10,border:`1px solid ${T.border}`,borderLeft:"3px solid #00BEFF",animation:`slideUp 0.25s ease ${i*0.05}s both`}}>
                        <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
                          <div style={{fontSize:24,flexShrink:0}}>{a.doctor?.split(" ")[0]||"🩺"}</div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                              <div style={{fontSize:14,fontWeight:800,color:T.text}}>{a.doctorName ? `Dr. ${a.doctorName}` : a.doctor}</div>
                              <div onClick={()=>deleteAppt(a.id)} style={{fontSize:15,cursor:"pointer",color:T.textFaint,padding:"2px 4px"}}>❌</div>
                            </div>
                            <div style={{fontSize:12,color:T.textMuted,marginBottom:4,fontWeight:600}}>{a.doctor}</div>
                            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:4}}>
                              <span style={{fontSize:10,fontWeight:700,color:"#00BEFF",background:"rgba(0,190,255,0.12)",padding:"2px 8px",borderRadius:20}}>👤 {a.member||"Family"}</span>
                              {a.date && <span style={{fontSize:10,color:T.textMuted,fontWeight:600}}>📅 {new Date(a.date+"T12:00:00").toLocaleDateString([],{month:"short",day:"numeric",year:"numeric"})}</span>}
                              {a.time && <span style={{fontSize:10,color:T.textMuted,fontWeight:600}}>🕐 {a.time}</span>}
                            </div>
                            {a.address && (
                              <a href={`https://maps.google.com/?q=${encodeURIComponent(a.address)}`} target="_blank" rel="noopener noreferrer" style={{textDecoration:"none"}}>
                                <div style={{fontSize:11,color:"#00BEFF",marginBottom:3}}>📍 {a.address}</div>
                              </a>
                            )}
                            {a.notes && <div style={{fontSize:11,color:T.textFaint,fontStyle:"italic"}}>{a.notes}</div>}
                          </div>
                        </div>
                        <div onClick={()=>toggleApptDone(a.id, a.done)} style={{marginTop:10,background:isDark?"rgba(0,190,255,0.1)":"rgba(0,190,255,0.08)",border:"1px solid rgba(0,190,255,0.25)",borderRadius:10,padding:"7px",textAlign:"center",cursor:"pointer",fontSize:11,fontWeight:700,color:"#00BEFF"}}>
                          ✔ Mark as Completed
                        </div>
                      </div>
                    ))}
                    {past.length > 0 && (
                      <>
                        <div style={{fontSize:10,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:700,margin:"16px 0 8px 4px"}}>✔ Past ({past.length})</div>
                        {past.map((a, i) => (
                          <div key={a.id} style={{display:"flex",alignItems:"center",gap:12,background:isDark?"rgba(255,255,255,0.02)":"rgba(0,0,0,0.03)",borderRadius:16,padding:"12px 14px",marginBottom:8,border:`1px solid ${T.border}`,opacity:0.55}}>
                            <div style={{fontSize:20}}>{a.doctor?.split(" ")[0]||"🩺"}</div>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontSize:13,fontWeight:600,color:T.textMuted,textDecoration:"line-through"}}>{a.doctor}</div>
                              <div style={{fontSize:10,color:T.textFaint}}>👤 {a.member||"Family"} · 📅 {a.date}</div>
                            </div>
                            <div onClick={()=>deleteAppt(a.id)} style={{fontSize:15,cursor:"pointer",color:T.textFaint,padding:"4px"}}>❌</div>
                          </div>
                        ))}
                      </>
                    )}
                  </>
                );
              })()}
            </div>


          </>
        )}

        {/* ─── TODO SCREEN ────────────────────────────────────────*/}
        {mainTab === "todo" && (
          <>
            <div style={{padding:"14px 16px 10px",borderBottom:`1px solid ${T.border}`,flexShrink:0}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                <div onClick={goHome} style={{cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",width:36,height:36,borderRadius:18,background:isDark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.05)",flexShrink:0,transition:"background 0.15s ease"}} title="Back to Home"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={T.textMuted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg></div>
                <div>
                  <h2 style={{fontSize:22,fontWeight:900,color:T.text,fontFamily:"Georgia,serif",letterSpacing:"-0.02em",margin:0}}>✅ To-Do</h2>
                  <div style={{fontSize:11,color:T.textFaint,marginTop:2}}>{todoItems.filter(t=>!t.done).length} pending · {todoItems.filter(t=>t.done).length} done</div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  {todoItems.some(t=>t.done) && (
                    <div onClick={async()=>{const done=todoItems.filter(t=>t.done);setTodoItems(p=>p.filter(t=>!t.done));try{await Promise.all(done.map(t=>fetch(`${TODO_URL}/${t.id}.json`,{method:"DELETE"})));}catch(e){}}} style={{fontSize:11,fontWeight:700,color:"#FF3B5C",cursor:"pointer",background:"rgba(255,59,92,0.1)",padding:"6px 12px",borderRadius:20}}>Clear Done</div>
                  )}
                  <div onClick={()=>{setShowAddTodo(p=>!p);setTodoInput("");setTodoDueDate("");setTodoPriority("medium");}} style={{width:36,height:36,borderRadius:18,background:showAddTodo?"#A855F7":"rgba(168,85,247,0.15)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,transition:"all 0.2s"}} title={showAddTodo?"Close":"Add Task"}>
                    <span style={{fontSize:22,color:showAddTodo?"#fff":"#A855F7",fontWeight:300,lineHeight:1,marginTop:showAddTodo?1:-1}}>{showAddTodo?"×":"+"}</span>
                  </div>
                </div>
              </div>

              {/* Assignee filter */}
              <div style={{display:"flex",gap:6,overflowX:"auto",marginBottom:10,paddingBottom:2,alignItems:"center"}}>
                {["all", ...familyMembers].map(m=>{
                  const active = todoAssignee === m;
                  return (
                    <div key={m} onClick={()=>setTodoAssignee(m)} style={{flexShrink:0,display:"flex",alignItems:"center",gap:4,padding:"5px 10px",borderRadius:20,cursor:"pointer",fontSize:11,fontWeight:active?700:500,background:active?"#A855F7":(isDark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.05)"),color:active?"#fff":T.textMuted,transition:"all 0.15s"}}>
                      {m==="all"?"👥 All":`👤 ${m}`}
                    </div>
                  );
                })}
              </div>

              {/* Add input */}
              {showAddTodo && (
              <div style={{background:isDark?"rgba(168,85,247,0.1)":"rgba(168,85,247,0.07)",border:"1px solid rgba(168,85,247,0.25)",borderRadius:16,padding:"12px 14px",marginBottom:10}}>
                {/* Notification status */}
                {notifPermission !== "granted" && (
                  <div onClick={()=>typeof Notification!=="undefined"&&Notification.requestPermission().then(p=>setNotifPermission(p))} style={{display:"flex",alignItems:"center",gap:6,background:"rgba(168,85,247,0.15)",borderRadius:10,padding:"6px 10px",marginBottom:10,cursor:"pointer"}}>
                    <span style={{fontSize:13}}>🔔</span>
                    <span style={{fontSize:10,color:"#A855F7",fontWeight:700}}>{notifPermission==="denied"?"Notifications blocked — enable in browser settings":"Tap to enable due-date reminders"}</span>
                  </div>
                )}
                {notifPermission === "granted" && (
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
                    <span style={{fontSize:11}}>🔔</span>
                    <span style={{fontSize:10,color:"#00C864",fontWeight:700}}>Reminders on — you'll be notified 1 day before due date</span>
                  </div>
                )}
                <div style={{display:"flex",gap:6,marginBottom:8}}>
                  {TODO_PRIORITIES.map(p=>(
                    <div key={p.id} onClick={()=>setTodoPriority(p.id)} style={{flex:1,padding:"8px 6px",borderRadius:12,cursor:"pointer",fontSize:11,minHeight:36,fontWeight:700,textAlign:"center",background:todoPriority===p.id?p.color:(isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.05)"),color:todoPriority===p.id?"#fff":T.textMuted,transition:"all 0.15s"}}>{p.label}</div>
                  ))}
                </div>
                <input value={todoInput} onChange={e=>setTodoInput(e.target.value)} placeholder={`Add task for ${todoAssignee==="all"?"family":todoAssignee}…`} style={{width:"100%",background:isDark?"rgba(255,255,255,0.07)":"rgba(255,255,255,0.9)",border:"1px solid rgba(168,85,247,0.3)",borderRadius:12,padding:"0 14px",fontSize:14,color:T.text,outline:"none",fontFamily:"inherit",marginBottom:8,boxSizing:"border-box",height:48,display:"block"}}/>
                <div style={{position:"relative",marginBottom:8}}>
                  <input type="date" value={todoDueDate} onChange={e=>setTodoDueDate(e.target.value)} style={{width:"100%",background:isDark?"rgba(255,255,255,0.07)":"rgba(255,255,255,0.9)",border:`1px solid ${todoDueDate?"#A855F7":"rgba(168,85,247,0.3)"}`,borderRadius:12,padding:"0 14px",fontSize:14,color:todoDueDate?T.text:"transparent",outline:"none",fontFamily:"inherit",boxSizing:"border-box",height:48,display:"block",lineHeight:"48px",WebkitAppearance:"none",appearance:"none",transition:"border-color 0.2s"}}/>
                  {!todoDueDate && (
                    <div style={{position:"absolute",top:0,left:0,right:0,bottom:0,display:"flex",alignItems:"center",paddingLeft:14,fontSize:14,color:"#aaa",pointerEvents:"none",borderRadius:12}}>
                      📅 Select due date
                    </div>
                  )}
                </div>
                <div onClick={()=>{addTodo();setShowAddTodo(false);}} style={{background: todoInput.trim()?"#A855F7":"rgba(168,85,247,0.25)",borderRadius:14,padding:"14px",textAlign:"center",cursor: todoInput.trim()?"pointer":"default",fontSize:14,fontWeight:800,color: todoInput.trim()?"#fff":"rgba(168,85,247,0.5)",transition:"all 0.2s",minHeight:48}}>
                  ➕ Add Task
                </div>
              </div>
              )}
            </div>

            <div style={{flex:1,overflowY:"auto",padding:"10px 14px 16px",WebkitOverflowScrolling:"touch"}}>
              {todoLoading && <div style={{textAlign:"center",paddingTop:40}}><div style={{fontSize:32,marginBottom:8}}>✅</div><div style={{fontSize:14,color:T.textFaint}}>Loading tasks…</div></div>}
              {!todoLoading && todoItems.length === 0 && (
                <div style={{textAlign:"center",paddingTop:50}}>
                  <div style={{fontSize:52,marginBottom:12}}>✅</div>
                  <div style={{fontSize:16,fontWeight:700,color:T.text,marginBottom:6}}>No tasks yet</div>
                  <div style={{fontSize:13,color:T.textFaint}}>Add your first task above</div>
                </div>
              )}
              {(() => {
                const filtered = todoAssignee === "all" ? todoItems : todoItems.filter(t => t.assignee === todoAssignee);
                const pending  = filtered.filter(t => !t.done);
                const done     = filtered.filter(t => t.done);
                return (
                  <>
                    {pending.map((t, i) => {
                      const pr = TODO_PRIORITIES.find(p => p.id === t.priority) || TODO_PRIORITIES[1];
                      const today = new Date().toISOString().split("T")[0];
                      const tomorrow = new Date(Date.now()+86400000).toISOString().split("T")[0];
                      const isOverdue  = t.dueDate && t.dueDate < today;
                      const isDueSoon  = t.dueDate === tomorrow;
                      const isDueToday = t.dueDate === today;
                      const dueDateColor = isOverdue?"#FF3B5C":isDueToday?"#FF3B5C":isDueSoon?"#FFB800":"#A855F7";
                      const dueDateLabel = isOverdue?"⚠️ Overdue":isDueToday?"🔥 Due today":isDueSoon?"⏰ Due tomorrow":t.dueDate?`📅 ${new Date(t.dueDate+"T12:00:00").toLocaleDateString([],{month:"short",day:"numeric"})}`:null;
                      return (
                        <div key={t.id} style={{background:T.bgCard,borderRadius:16,padding:"13px 14px",marginBottom:8,border:`1px solid ${isOverdue?"rgba(255,59,92,0.4)":T.border}`,borderLeft:`3px solid ${isOverdue?"#FF3B5C":pr.color}`,animation:`slideUp 0.25s ease ${i*0.04}s both`}}>
                          {editingTodoId === t.id ? (
                            <div>
                              <input autoFocus value={editTodoText} onChange={e=>setEditTodoText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")updateTodo(t.id,editTodoText,editTodoPriority,editTodoDueDate);if(e.key==="Escape")setEditingTodoId(null);}} style={{width:"100%",background:isDark?"rgba(255,255,255,0.07)":"rgba(255,255,255,0.9)",border:"1px solid #A855F7",borderRadius:10,padding:"8px 12px",fontSize:14,color:T.text,outline:"none",fontFamily:"inherit",boxSizing:"border-box",marginBottom:8}}/>
                              <div style={{display:"flex",gap:6,marginBottom:8}}>
                                {TODO_PRIORITIES.map(p=>(
                                  <div key={p.id} onClick={()=>setEditTodoPriority(p.id)} style={{flex:1,padding:"6px 4px",borderRadius:10,cursor:"pointer",fontSize:10,fontWeight:700,textAlign:"center",background:editTodoPriority===p.id?p.color:(isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.05)"),color:editTodoPriority===p.id?"#fff":T.textMuted,transition:"all 0.15s"}}>{p.label}</div>
                                ))}
                              </div>
                              <input type="date" value={editTodoDueDate} onChange={e=>setEditTodoDueDate(e.target.value)} style={{width:"100%",background:isDark?"rgba(255,255,255,0.07)":"rgba(255,255,255,0.9)",border:`1px solid ${editTodoDueDate?"#A855F7":"rgba(168,85,247,0.3)"}`,borderRadius:10,padding:"8px 12px",fontSize:14,color:T.text,outline:"none",fontFamily:"inherit",boxSizing:"border-box",marginBottom:8}}/>
                              <div style={{display:"flex",gap:8}}>
                                <div onClick={()=>updateTodo(t.id,editTodoText,editTodoPriority,editTodoDueDate)} style={{flex:1,background:"#A855F7",borderRadius:10,padding:"10px",textAlign:"center",cursor:"pointer",fontSize:13,fontWeight:800,color:"#fff"}}>✔ Save</div>
                                <div onClick={()=>setEditingTodoId(null)} style={{flex:1,background:isDark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.06)",borderRadius:10,padding:"10px",textAlign:"center",cursor:"pointer",fontSize:13,fontWeight:700,color:T.textMuted}}>✕ Cancel</div>
                              </div>
                            </div>
                          ) : (
                            <div style={{display:"flex",alignItems:"center",gap:12}}>
                              <div onClick={()=>toggleTodo(t.id,t.done)} style={{width:24,height:24,borderRadius:8,border:`2px solid ${pr.color}`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,background:"transparent"}}/>
                              <div style={{flex:1,minWidth:0}} onClick={()=>{setEditingTodoId(t.id);setEditTodoText(t.text);setEditTodoPriority(t.priority||"medium");setEditTodoDueDate(t.dueDate||"");}}>
                                <div style={{fontSize:14,fontWeight:600,color:T.text,marginBottom:3}}>{t.text}</div>
                                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                                  <span style={{fontSize:9,fontWeight:700,color:pr.color}}>{pr.label}</span>
                                  <span style={{fontSize:11,color:T.textFaint}}>👤 {t.assignee||"Family"}</span>
                                  {dueDateLabel && <span style={{fontSize:9,fontWeight:700,color:dueDateColor}}>{dueDateLabel}</span>}
                                </div>
                              </div>
                              <div onClick={()=>{setEditingTodoId(t.id);setEditTodoText(t.text);setEditTodoPriority(t.priority||"medium");setEditTodoDueDate(t.dueDate||"");}} style={{fontSize:15,cursor:"pointer",color:"#A855F7",padding:"4px 6px",flexShrink:0}} title="Edit task">✏️</div>
                              <div onClick={()=>deleteTodo(t.id)} style={{fontSize:16,cursor:"pointer",color:T.textFaint,padding:"4px",flexShrink:0}}>❌</div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {done.length > 0 && (
                      <>
                        <div style={{fontSize:10,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:700,margin:"16px 0 8px 4px"}}>✔ Done ({done.length})</div>
                        {done.map(t => (
                          <div key={t.id} style={{display:"flex",alignItems:"center",gap:12,background:isDark?"rgba(255,255,255,0.02)":"rgba(0,0,0,0.03)",borderRadius:16,padding:"12px 14px",marginBottom:8,border:`1px solid ${T.border}`,opacity:0.55}}>
                            <div onClick={()=>toggleTodo(t.id,t.done)} style={{width:24,height:24,borderRadius:8,background:"#A855F7",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,fontSize:13,color:"#fff",fontWeight:800}}>✔</div>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontSize:14,fontWeight:500,color:T.textMuted,textDecoration:"line-through"}}>{t.text}</div>
                              <div style={{fontSize:11,color:T.textFaint,marginTop:2}}>👤 {t.assignee||"Family"}</div>
                            </div>
                            <div onClick={()=>deleteTodo(t.id)} style={{fontSize:16,cursor:"pointer",color:T.textFaint,padding:"4px",flexShrink:0}}>❌</div>
                          </div>
                        ))}
                      </>
                    )}
                  </>
                );
              })()}
            </div>


          </>
        )}

        {/* ─── RESERVATIONS SCREEN ────────────────────────────────────────*/}
        {mainTab === "reservations" && (
          <>
            <div style={{padding:"14px 16px 10px",borderBottom:`1px solid ${T.border}`,flexShrink:0}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                <div onClick={goHome} style={{cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",width:36,height:36,borderRadius:18,background:isDark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.05)",flexShrink:0,transition:"background 0.15s ease"}} title="Back to Home"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={T.textMuted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg></div>
                <div>
                  <h2 style={{fontSize:22,fontWeight:900,color:T.text,fontFamily:"Georgia,serif",letterSpacing:"-0.02em",margin:0}}>🗓️ Reservations</h2>
                  <div style={{fontSize:11,color:T.textFaint,marginTop:2}}>{resvItems.filter(r=>!r.past).length} upcoming · {resvItems.filter(r=>r.past).length} past</div>
                </div>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  {gAccounts.length > 0 && (
                    <div
                      onClick={()=>{
                        let snapshot = resvItems;
                        (async()=>{
                          for(const acc of gAccounts){
                            await syncAccountReservations(acc, snapshot);
                            setResvItems(prev=>{ snapshot=prev; return prev; });
                          }
                        })();
                      }}
                      style={{background:"rgba(99,102,241,0.15)",borderRadius:14,padding:"9px 13px",cursor:"pointer",fontSize:12,fontWeight:700,color:"#6366F1",display:"flex",alignItems:"center",gap:5}}
                    >
                      {Object.values(gSyncing).some(Boolean)?"⏳":"📍§"} Sync Emails
                    </div>
                  )}
                  <div onClick={()=>setShowResvForm(true)} style={{background:"linear-gradient(135deg,#F97316,#EAB308)",borderRadius:14,padding:"9px 16px",cursor:"pointer",fontSize:13,fontWeight:700,color:"#fff"}}>+ Add</div>
                </div>
              </div>
              {/* Type filter pills */}
              <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:4}}>
                {[{id:"all",emoji:"\ud83d\uddd3\ufe0f",label:"All"}, ...RESV_TYPES].map(t=>{
                  const active = resvFilterType === t.id;
                  return <div key={t.id} onClick={()=>setResvFilterType(t.id)} style={{flexShrink:0,padding:"5px 11px",borderRadius:20,cursor:"pointer",fontSize:11,fontWeight:active?700:500,background:active?(t.color||"#F97316"):(isDark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.05)"),color:active?"#fff":T.textMuted,transition:"all 0.15s"}}>{t.emoji} {t.label}</div>;
                })}
              </div>
            </div>

            {/* Add Reservation Form */}
            {showResvForm && (
              <div style={{position:"absolute",inset:0,zIndex:200,background:"rgba(0,0,0,0.6)",display:"flex",flexDirection:"column",justifyContent:"flex-end"}} onClick={()=>setShowResvForm(false)}>
                <div style={{background:isDark?"#13151A":"#fff",borderRadius:"24px 24px 0 0",padding:"20px 18px max(36px,calc(36px + env(safe-area-inset-bottom,0px)))",border:`1px solid ${T.border}`,maxHeight:"85%",overflowY:"auto",WebkitOverflowScrolling:"touch"}} onClick={e=>e.stopPropagation()}>
                  <div style={{width:36,height:4,background:isDark?"rgba(255,255,255,0.2)":"rgba(0,0,0,0.15)",borderRadius:2,margin:"0 auto 16px"}}/>
                  <div style={{fontSize:15,fontWeight:800,color:T.text,marginBottom:14}}>🗓️ New Reservation</div>

                  {/* Type */}
                  <div style={{fontSize:11,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.07em",fontWeight:700,marginBottom:6}}>Type</div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
                    {RESV_TYPES.map(t=>(
                      <div key={t.id} onClick={()=>setResvForm(f=>({...f,type:t.id}))} style={{padding:"5px 11px",borderRadius:20,fontSize:11,fontWeight:600,cursor:"pointer",background:resvForm.type===t.id?t.color:(isDark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.06)"),color:resvForm.type===t.id?"#fff":T.textMuted}}>{t.emoji} {t.label}</div>
                    ))}
                  </div>

                  {/* Name */}
                  <div style={{fontSize:11,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.07em",fontWeight:700,marginBottom:6}}>Name / Place</div>
                  <input value={resvForm.name} onChange={e=>setResvForm(f=>({...f,name:e.target.value}))} placeholder="e.g. The Capital Grille, Marriott Downtown\u2026" style={{width:"100%",background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:12,padding:"12px 14px",fontSize:14,color:T.text,outline:"none",fontFamily:"inherit",minHeight:48,marginBottom:12,boxSizing:"border-box"}}/>

                  {/* Address */}
                  <div style={{fontSize:11,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.07em",fontWeight:700,marginBottom:6}}>Address</div>
                  <input value={resvForm.address} onChange={e=>setResvForm(f=>({...f,address:e.target.value}))} placeholder="e.g. 500 Main St, Detroit, MI" style={{width:"100%",background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:12,padding:"12px 14px",fontSize:14,color:T.text,outline:"none",fontFamily:"inherit",minHeight:48,marginBottom:12,boxSizing:"border-box"}}/>

                  {/* Date, Time, Party size */}
                  <div style={{display:"flex",gap:8,marginBottom:12}}>
                    <div style={{flex:2}}>
                      <div style={{fontSize:11,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.07em",fontWeight:700,marginBottom:6}}>Date</div>
                      <input type="date" value={resvForm.date} onChange={e=>setResvForm(f=>({...f,date:e.target.value}))} style={{width:"100%",background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:12,padding:"12px 14px",fontSize:14,color:T.text,outline:"none",fontFamily:"inherit",minHeight:48,boxSizing:"border-box"}}/>
                    </div>
                    <div style={{flex:1.5}}>
                      <div style={{fontSize:11,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.07em",fontWeight:700,marginBottom:6}}>Time</div>
                      <input type="time" value={resvForm.time} onChange={e=>setResvForm(f=>({...f,time:e.target.value}))} style={{width:"100%",background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:12,padding:"12px 14px",fontSize:14,color:T.text,outline:"none",fontFamily:"inherit",minHeight:48,boxSizing:"border-box"}}/>
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:11,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.07em",fontWeight:700,marginBottom:6}}>Guests</div>
                      <input type="number" value={resvForm.partySize} onChange={e=>setResvForm(f=>({...f,partySize:e.target.value}))} placeholder="2" min="1" style={{width:"100%",background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:12,padding:"12px 14px",fontSize:14,color:T.text,outline:"none",fontFamily:"inherit",minHeight:48,boxSizing:"border-box"}}/>
                    </div>
                  </div>

                  {/* Confirmation # */}
                  <div style={{fontSize:11,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.07em",fontWeight:700,marginBottom:6}}>Confirmation # (optional)</div>
                  <input value={resvForm.confirmNo} onChange={e=>setResvForm(f=>({...f,confirmNo:e.target.value}))} placeholder="e.g. RES-12345" style={{width:"100%",background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:12,padding:"12px 14px",fontSize:14,color:T.text,outline:"none",fontFamily:"inherit",minHeight:48,marginBottom:12,boxSizing:"border-box"}}/>

                  {/* Assigned To */}
                  <div style={{fontSize:11,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.07em",fontWeight:700,marginBottom:6}}>Assigned To (optional)</div>
                  <select value={resvForm.assignedTo} onChange={e=>setResvForm(f=>({...f,assignedTo:e.target.value}))} style={{width:"100%",background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:12,padding:"10px 12px",fontSize:13,color:resvForm.assignedTo?T.text:T.textFaint,outline:"none",fontFamily:"inherit",marginBottom:12,boxSizing:"border-box",appearance:"none"}}>
                    <option value="">— None —</option>
                    {familyMembers.map(m=><option key={m} value={m}>{m}</option>)}
                  </select>

                  {/* Notes */}
                  <div style={{fontSize:11,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.07em",fontWeight:700,marginBottom:6}}>Notes (optional)</div>
                  <input value={resvForm.notes} onChange={e=>setResvForm(f=>({...f,notes:e.target.value}))} placeholder="e.g. Window table, anniversary dinner\u2026" style={{width:"100%",background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:12,padding:"12px 14px",fontSize:14,color:T.text,outline:"none",fontFamily:"inherit",minHeight:48,marginBottom:16,boxSizing:"border-box"}}/>

                  <div onClick={saveResv} style={{background:"linear-gradient(135deg,#F97316,#EAB308)",borderRadius:16,padding:"16px",textAlign:"center",cursor:"pointer",fontSize:15,fontWeight:800,color:"#fff",minHeight:52}}>
                    💾 Save Reservation
                  </div>
                </div>
              </div>
            )}

            {/* List */}
            <div style={{flex:1,overflowY:"auto",padding:"10px 14px 16px",WebkitOverflowScrolling:"touch"}}>

              {resvLoading && <div style={{textAlign:"center",paddingTop:40}}><div style={{fontSize:32,marginBottom:8}}>🗓️</div><div style={{fontSize:14,color:T.textFaint}}>Loading reservations…</div></div>}
              {!resvLoading && resvItems.length === 0 && (
                <div style={{textAlign:"center",paddingTop:50}}>
                  <div style={{fontSize:52,marginBottom:12}}>🗓️</div>
                  <div style={{fontSize:16,fontWeight:700,color:T.text,marginBottom:6}}>
                    No reservations yet
                  </div>
                  <div style={{fontSize:13,color:T.textFaint,marginBottom:20}}>
                    {gAccounts.length > 0
                      ? "Syncing emails automatically… Tap \"Sync Emails\" to refresh, or add one manually"
                      : "Connect Google to auto-import from email, or tap + Add to save one manually"}
                  </div>
                  <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
                      {gAccounts.length > 0 && (
                        <div
                          onClick={()=>{
                            let snapshot = resvItems;
                            (async()=>{
                              for(const acc of gAccounts){
                                await syncAccountReservations(acc, snapshot);
                                setResvItems(prev=>{ snapshot=prev; return prev; });
                              }
                            })();
                          }}
                          style={{background:"rgba(99,102,241,0.15)",borderRadius:16,padding:"12px 20px",cursor:"pointer",fontSize:13,fontWeight:700,color:"#6366F1"}}
                        >
                          {Object.values(gSyncing).some(Boolean)?"⏳ Syncing…":"📧 Sync Emails"}
                        </div>
                      )}
                      <div onClick={()=>setShowResvForm(true)} style={{display:"inline-block",background:"linear-gradient(135deg,#F97316,#EAB308)",borderRadius:16,padding:"12px 24px",cursor:"pointer",fontSize:13,fontWeight:700,color:"#fff"}}>+ Add Reservation</div>
                    </div>
                </div>
              )}
              {(() => {
                const filterT = resvFilterType;
                const filtered = filterT === "all" ? resvItems : resvItems.filter(r => r.type === filterT);
                const upcoming = filtered.filter(r => !r.past);
                const past     = filtered.filter(r => r.past);
                return (
                  <>
                    {upcoming.map((r, i) => {
                      const rt = RESV_TYPES.find(t => t.id === r.type) || { id:"other", label:"Other", emoji:"🗓️", color:"#6B7280" };
                      return (
                        <div key={r.id} style={{background:T.bgCard,borderRadius:18,padding:"14px 16px",marginBottom:10,border:`1px solid ${T.border}`,borderLeft:`3px solid ${rt.color}`,animation:`slideUp 0.25s ease ${i*0.05}s both`}}>
                          <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
                            <div style={{fontSize:26,flexShrink:0}}>{rt.emoji}</div>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                                <div style={{fontSize:15,fontWeight:800,color:T.text}}>{r.name}</div>
                                <div onClick={()=>deleteResv(r.id)} style={{fontSize:15,cursor:"pointer",color:T.textFaint,padding:"2px 4px"}}>❌</div>
                              </div>
                              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:4}}>
                                <span style={{fontSize:10,fontWeight:700,color:rt.color,background:`${rt.color}18`,padding:"2px 8px",borderRadius:20}}>{rt.emoji} {rt.label}</span>
                                {r.date && <span style={{fontSize:10,color:T.textMuted,fontWeight:600}}>📅 {new Date(r.date+"T12:00:00").toLocaleDateString([],{month:"short",day:"numeric",year:"numeric"})}</span>}
                                {r.time && <span style={{fontSize:10,color:T.textMuted,fontWeight:600}}>🕐 {r.time}</span>}
                                {r.partySize && <span style={{fontSize:10,color:T.textMuted,fontWeight:600}}>👥 {r.partySize} guests</span>}
                              </div>
                              {r.address && <a href={`https://maps.google.com/?q=${encodeURIComponent(r.address)}`} target="_blank" rel="noopener noreferrer" style={{textDecoration:"none"}}><div style={{fontSize:11,color:rt.color,marginBottom:3}}>📍 {r.address}</div></a>}
                              {r.confirmNo && <div style={{fontSize:11,color:T.textMuted,marginBottom:3}}>🎫 Confirmation: <strong style={{color:T.text}}>{r.confirmNo}</strong></div>}
                              {r.notes && <div style={{fontSize:11,color:T.textFaint,fontStyle:"italic"}}>{r.notes}</div>}
                              {r.source === "gcal" && <div style={{fontSize:9,fontWeight:700,color:"#10B981",marginTop:4,display:"flex",alignItems:"center",gap:4}}><span style={{background:"rgba(16,185,129,0.15)",borderRadius:6,padding:"1px 5px"}}>📅 Google Calendar</span><span style={{color:T.textFaint}}>{r.sourceEmail||""}</span></div>}
                              {r.source === "gmail" && <div style={{fontSize:9,fontWeight:700,color:"#6366F1",marginTop:4,display:"flex",alignItems:"center",gap:4}}><span style={{background:"rgba(99,102,241,0.15)",borderRadius:6,padding:"1px 5px"}}>📍§ Auto-imported from Gmail</span><span style={{color:T.textFaint}}>{r.sourceEmail||""}</span></div>}
                            </div>
                          </div>
                          <div onClick={()=>markResvPast(r.id, r.past)} style={{marginTop:10,background:isDark?`${rt.color}12`:`${rt.color}10`,border:`1px solid ${rt.color}30`,borderRadius:10,padding:"7px",textAlign:"center",cursor:"pointer",fontSize:11,fontWeight:700,color:rt.color}}>
                            ✔ Mark as Past
                          </div>
                        </div>
                      );
                    })}
                    {past.length > 0 && (
                      <>
                        <div style={{fontSize:10,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:700,margin:"16px 0 8px 4px"}}>✔ Past ({past.length})</div>
                        {past.map(r => {
                          const rt = RESV_TYPES.find(t => t.id === r.type) || { id:"other", label:"Other", emoji:"🗓️", color:"#6B7280" };
                          return (
                            <div key={r.id} style={{display:"flex",alignItems:"center",gap:12,background:isDark?"rgba(255,255,255,0.02)":"rgba(0,0,0,0.03)",borderRadius:16,padding:"12px 14px",marginBottom:8,border:`1px solid ${T.border}`,opacity:0.55}}>
                              <div style={{fontSize:22}}>{rt.emoji}</div>
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{fontSize:13,fontWeight:600,color:T.textMuted,textDecoration:"line-through"}}>{r.name}</div>
                                <div style={{fontSize:10,color:T.textFaint}}>📅 {r.date} {r.time && `· 🕐 ${r.time}`}</div>
                              </div>
                              <div onClick={()=>deleteResv(r.id)} style={{fontSize:15,cursor:"pointer",color:T.textFaint,padding:"4px"}}>❌</div>
                            </div>
                          );
                        })}
                      </>
                    )}
                  </>
                );
              })()}
            </div>


          </>
        )}

        {/* ─── CLOTHING SCREEN ────────────────────────────────────────*/}
        {mainTab === "clothing" && (
          <>
            <div style={{padding:"14px 16px 10px",borderBottom:`1px solid ${T.border}`,flexShrink:0}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                <div onClick={goHome} style={{cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",width:36,height:36,borderRadius:18,background:isDark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.05)",flexShrink:0,transition:"background 0.15s ease"}} title="Back to Home"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={T.textMuted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg></div>
                <div>
                  <h2 style={{fontSize:22,fontWeight:900,color:T.text,fontFamily:"Georgia,serif",letterSpacing:"-0.02em",margin:0}}>👔 Clothing</h2>
                  <div style={{fontSize:11,color:T.textFaint,marginTop:2}}>{clothingItems.filter(c=>!c.purchased).length} to buy · {clothingItems.filter(c=>c.purchased).length} purchased</div>
                </div>
                {clothingItems.some(c=>c.purchased) && (
                  <div onClick={async()=>{const done=clothingItems.filter(c=>c.purchased);setClothingItems(p=>p.filter(c=>!c.purchased));try{await Promise.all(done.map(c=>fetch(`${CLOTHING_URL}/${c.id}.json`,{method:"DELETE"})));}catch(e){}}} style={{fontSize:11,fontWeight:700,color:"#F43F5E",cursor:"pointer",background:"rgba(244,63,94,0.1)",padding:"6px 12px",borderRadius:20}}>Clear Bought</div>
                )}
              </div>

              {/* Family member filter */}
              <div style={{display:"flex",gap:6,overflowX:"auto",marginBottom:8,paddingBottom:2,alignItems:"center"}}>
                {["all", ...familyMembers].map(m=>{
                  const active = clothingMember === m;
                  return (
                    <div key={m} style={{flexShrink:0,display:"flex",alignItems:"center",gap:4,padding:"5px 10px",borderRadius:20,cursor:"pointer",fontSize:11,fontWeight:active?700:500,background:active?"#F43F5E":(isDark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.05)"),color:active?"#fff":T.textMuted,transition:"all 0.15s"}}>
                      <span onClick={()=>setClothingMember(m)}>{m==="all"?"👥 All":`👤 ${m}`}</span>
                      {m !== "all" && <span onClick={()=>removeFamilyMember(m)} style={{fontSize:9,opacity:0.6,marginLeft:2,cursor:"pointer"}}>❌</span>}
                    </div>
                  );
                })}
                {showAddMember ? (
                  <div style={{display:"flex",gap:4,flexShrink:0,alignItems:"center"}}>
                    <input autoFocus value={newMemberInput} onChange={e=>setNewMemberInput(e.target.value)}
                      onKeyDown={e=>e.key==="Enter"&&addFamilyMember()}
                      placeholder="Name…" style={{width:80,background:T.bgInput,border:"1px solid #F43F5E",borderRadius:20,padding:"5px 10px",fontSize:11,color:T.text,outline:"none"}}/>
                    <div onClick={addFamilyMember} style={{padding:"5px 10px",borderRadius:20,background:"#F43F5E",color:"#fff",fontSize:11,fontWeight:800,cursor:"pointer",flexShrink:0}}>✔</div>
                    <div onClick={()=>{setShowAddMember(false);setNewMemberInput("");}} style={{padding:"5px 8px",borderRadius:20,background:isDark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.05)",color:T.textMuted,fontSize:11,cursor:"pointer",flexShrink:0}}>❌</div>
                  </div>
                ) : (
                  <div onClick={()=>setShowAddMember(true)} style={{flexShrink:0,padding:"5px 10px",borderRadius:20,cursor:"pointer",fontSize:11,fontWeight:600,background:isDark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.05)",color:T.textMuted,border:`1px dashed ${T.border}`}}>+ Add</div>
                )}
              </div>

              {/* Category filter */}
              <div style={{display:"flex",gap:6,overflowX:"auto",marginBottom:10,paddingBottom:2}}>
                {CLOTHING_CATEGORIES.map(c=>{
                  const active = clothingCategory === c.id;
                  return <div key={c.id} onClick={()=>setClothingCategory(c.id)} style={{flexShrink:0,padding:"5px 11px",borderRadius:20,cursor:"pointer",fontSize:11,fontWeight:active?700:500,background:active?c.color:(isDark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.05)"),color:active?"#fff":T.textMuted,transition:"all 0.15s"}}>{c.emoji} {c.label}</div>;
                })}
              </div>

              {/* Add input */}
              <div style={{background:isDark?"rgba(244,63,94,0.1)":"rgba(244,63,94,0.07)",border:"1px solid rgba(244,63,94,0.25)",borderRadius:16,padding:"12px 14px"}}>
                <div style={{fontSize:11,color:"#F43F5E",fontWeight:700,marginBottom:8}}>
                  👔 Adding {clothingCategory==="all"?"item":clothingCategory} for {clothingMember==="all"?"family":clothingMember}
                </div>
                <div style={{display:"flex",gap:8}}>
                  <input value={clothingInput} onChange={e=>setClothingInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addClothingItem()} placeholder="e.g. Blue jeans size 32, Nike sneakers…" style={{flex:1,background:isDark?"rgba(255,255,255,0.07)":"rgba(255,255,255,0.9)",border:"1px solid rgba(244,63,94,0.3)",borderRadius:12,padding:"10px 13px",fontSize:13,color:T.text,outline:"none",fontFamily:"inherit"}}/>
                  <div onClick={addClothingItem} style={{background:"#F43F5E",borderRadius:12,padding:"10px 16px",cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,color:"#fff"}}>➕</div>
                </div>
              </div>
            </div>

            <div style={{flex:1,overflowY:"auto",padding:"10px 14px 16px",WebkitOverflowScrolling:"touch"}}>
              {clothingLoading && <div style={{textAlign:"center",paddingTop:40}}><div style={{fontSize:32,marginBottom:8}}>👔</div><div style={{fontSize:14,color:T.textFaint}}>Loading…</div></div>}
              {!clothingLoading && clothingItems.length === 0 && (
                <div style={{textAlign:"center",paddingTop:50}}>
                  <div style={{fontSize:52,marginBottom:12}}>👔</div>
                  <div style={{fontSize:16,fontWeight:700,color:T.text,marginBottom:6}}>No clothing items yet</div>
                  <div style={{fontSize:13,color:T.textFaint}}>Select a member & category above to add items</div>
                </div>
              )}
              {(() => {
                let filtered = clothingItems;
                if (clothingMember !== "all") filtered = filtered.filter(c => c.member === clothingMember);
                if (clothingCategory !== "all") filtered = filtered.filter(c => c.category === clothingCategory);
                const pending   = filtered.filter(c => !c.purchased);
                const purchased = filtered.filter(c => c.purchased);
                const catMap = Object.fromEntries(CLOTHING_CATEGORIES.map(c=>[c.id,c]));
                return (
                  <>
                    {pending.map((c, i) => {
                      const cat = catMap[c.category] || catMap["Other"];
                      return (
                        <div key={c.id} style={{display:"flex",alignItems:"center",gap:12,background:T.bgCard,borderRadius:16,padding:"13px 14px",marginBottom:8,border:`1px solid ${T.border}`,borderLeft:`3px solid ${cat.color}`,animation:`slideUp 0.25s ease ${i*0.04}s both`}}>
                          <div onClick={()=>toggleClothing(c.id,c.purchased)} style={{width:24,height:24,borderRadius:8,border:`2px solid ${cat.color}`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,background:"transparent",fontSize:13}}>{cat.emoji}</div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:14,fontWeight:600,color:T.text,marginBottom:3}}>{c.text}</div>
                            <div style={{display:"flex",gap:8}}>
                              <span style={{fontSize:9,fontWeight:700,color:cat.color}}>{cat.emoji} {c.category}</span>
                              <span style={{fontSize:11,color:T.textFaint}}>👤 {c.member||"Family"}</span>
                            </div>
                          </div>
                          <div onClick={()=>deleteClothingItem(c.id)} style={{fontSize:16,cursor:"pointer",color:T.textFaint,padding:"4px",flexShrink:0}}>❌</div>
                        </div>
                      );
                    })}
                    {purchased.length > 0 && (
                      <>
                        <div style={{fontSize:10,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:700,margin:"16px 0 8px 4px"}}>✔ Purchased ({purchased.length})</div>
                        {purchased.map(c => {
                          const cat = catMap[c.category] || catMap["Other"];
                          return (
                            <div key={c.id} style={{display:"flex",alignItems:"center",gap:12,background:isDark?"rgba(255,255,255,0.02)":"rgba(0,0,0,0.03)",borderRadius:16,padding:"12px 14px",marginBottom:8,border:`1px solid ${T.border}`,opacity:0.55}}>
                              <div onClick={()=>toggleClothing(c.id,c.purchased)} style={{width:24,height:24,borderRadius:8,background:"#F43F5E",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,fontSize:12,color:"#fff",fontWeight:800}}>✔</div>
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{fontSize:14,fontWeight:500,color:T.textMuted,textDecoration:"line-through"}}>{c.text}</div>
                                <div style={{fontSize:11,color:T.textFaint,marginTop:2}}>{cat.emoji} {c.category} · 👤 {c.member||"Family"}</div>
                              </div>
                              <div onClick={()=>deleteClothingItem(c.id)} style={{fontSize:16,cursor:"pointer",color:T.textFaint,padding:"4px",flexShrink:0}}>❌</div>
                            </div>
                          );
                        })}
                      </>
                    )}
                  </>
                );
              })()}
            </div>


          </>
        )}

        {/* ─── CALC & CONVERT SCREEN ────────────────────────────────────────*/}
        {mainTab === "calc" && (
          <>
            <div style={{padding:"14px 16px 10px",borderBottom:`1px solid ${T.border}`,flexShrink:0}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                <div onClick={goHome} style={{cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",width:36,height:36,borderRadius:18,background:isDark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.05)",flexShrink:0,transition:"background 0.15s ease"}} title="Back to Home"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={T.textMuted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg></div>
                <h2 style={{fontSize:22,fontWeight:900,color:T.text,fontFamily:"Georgia,serif",letterSpacing:"-0.02em",margin:0}}>🧮 Calc & Convert</h2>
              </div>
              {/* Tab pills */}
              <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:2}}>
                {[
                  {id:"discount",  label:"% Discount", emoji:"🏷️"},
                  {id:"interest",  label:"Interest",   emoji:"🏦"},
                  {id:"currency",  label:"Currency",   emoji:"📱"},
                  {id:"units",     label:"Units",      emoji:"📍"},
                ].map(t => {
                  const a = calcTab === t.id;
                  return <div key={t.id} onClick={()=>setCalcTab(t.id)} style={{flexShrink:0,padding:"6px 14px",borderRadius:20,cursor:"pointer",fontSize:11,fontWeight:a?700:500,background:a?"linear-gradient(135deg,#14B8A6,#06B6D4)":(isDark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.05)"),color:a?"#fff":T.textMuted,transition:"all 0.15s"}}>{t.emoji} {t.label}</div>;
                })}
              </div>
            </div>

            <div style={{flex:1,overflowY:"auto",padding:"16px 16px 32px"}}>

              {/* ─── DISCOUNT TAB ────────────────────────────────────────*/}
              {calcTab === "discount" && (() => {
                const orig = parseFloat(discOrigPrice);
                const pct  = parseFloat(discPercent);
                const saving   = (!isNaN(orig) && !isNaN(pct)) ? orig * pct / 100 : null;
                const final    = saving !== null ? orig - saving : null;
                const tips = [10,20,25,30,50,70];
                return (
                  <div>
                    <div style={{fontSize:13,fontWeight:800,color:T.text,marginBottom:12}}>🏷️ Store Discount Calculator</div>
                    <div style={{background:T.bgCard,borderRadius:18,padding:"16px",marginBottom:12,border:`1px solid ${T.border}`}}>
                      <div style={{fontSize:11,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.07em",fontWeight:700,marginBottom:6}}>Original Price</div>
                      <div style={{position:"relative",marginBottom:14}}>
                        <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",fontSize:18,fontWeight:800,color:T.textMuted,pointerEvents:"none"}}>$</span>
                        <input value={discOrigPrice} onChange={e=>setDiscOrigPrice(e.target.value)} type="number" placeholder="0.00"
                          style={{width:"100%",boxSizing:"border-box",background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:12,padding:"10px 14px 10px 30px",fontSize:22,fontWeight:800,color:T.text,outline:"none"}}/>
                      </div>
                      <div style={{fontSize:11,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.07em",fontWeight:700,marginBottom:6}}>Discount %</div>
                      <input value={discPercent} onChange={e=>setDiscPercent(e.target.value)} type="number" placeholder="e.g. 20"
                        style={{width:"100%",boxSizing:"border-box",background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:12,padding:"10px 14px",fontSize:22,fontWeight:800,color:T.text,outline:"none",marginBottom:10}}/>
                      {/* Quick % buttons */}
                      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                        {tips.map(p => <div key={p} onClick={()=>setDiscPercent(String(p))} style={{padding:"5px 12px",borderRadius:20,background:discPercent==String(p)?"#14B8A6":(isDark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.06)"),color:discPercent==String(p)?"#fff":T.textMuted,fontSize:11,fontWeight:700,cursor:"pointer"}}>{p}%</div>)}
                      </div>
                    </div>
                    {final !== null && (
                      <div style={{background:"linear-gradient(135deg,rgba(20,184,166,0.15),rgba(6,182,212,0.1))",border:"1px solid rgba(20,184,166,0.3)",borderRadius:18,padding:"20px 16px"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                          <div>
                            <div style={{fontSize:10,color:"#14B8A6",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em"}}>You Save</div>
                            <div style={{fontSize:32,fontWeight:900,color:"#14B8A6"}}>${saving.toFixed(2)}</div>
                          </div>
                          <div style={{textAlign:"right"}}>
                            <div style={{fontSize:10,color:T.textFaint,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em"}}>You Pay</div>
                            <div style={{fontSize:32,fontWeight:900,color:T.text}}>${final.toFixed(2)}</div>
                          </div>
                        </div>
                        <div style={{height:1,background:T.border,marginBottom:10}}/>
                        <div style={{fontSize:11,color:T.textFaint}}>
                          Original <strong style={{color:T.text}}>${orig.toFixed(2)}</strong> → {pct}% off → Save <strong style={{color:"#14B8A6"}}>${saving.toFixed(2)}</strong>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ─── INTEREST TAB ────────────────────────────────────────*/}
              {calcTab === "interest" && (() => {
                const p = parseFloat(intPrincipal);
                const r = parseFloat(intRate) / 100;
                const t = parseFloat(intYears);
                let interest = null, total = null;
                if (!isNaN(p) && !isNaN(r) && !isNaN(t) && t > 0) {
                  if (intType === "simple") {
                    interest = p * r * t;
                    total    = p + interest;
                  } else {
                    total    = p * Math.pow(1 + r, t);
                    interest = total - p;
                  }
                }
                return (
                  <div>
                    <div style={{fontSize:13,fontWeight:800,color:T.text,marginBottom:12}}>🏦 Interest Calculator</div>
                    {/* Simple / Compound toggle */}
                    <div style={{display:"flex",gap:6,marginBottom:14}}>
                      {["simple","compound"].map(type => (
                        <div key={type} onClick={()=>setIntType(type)} style={{flex:1,textAlign:"center",padding:"9px",borderRadius:14,cursor:"pointer",fontSize:12,fontWeight:700,background:intType===type?"linear-gradient(135deg,#14B8A6,#06B6D4)":(isDark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.06)"),color:intType===type?"#fff":T.textMuted,textTransform:"capitalize"}}>{type}</div>
                      ))}
                    </div>
                    <div style={{background:T.bgCard,borderRadius:18,padding:"16px",marginBottom:12,border:`1px solid ${T.border}`}}>
                      {[
                        {label:"Principal ($)", val:intPrincipal, set:setIntPrincipal, ph:"e.g. 10000"},
                        {label:"Annual Rate (%)", val:intRate,      set:setIntRate,      ph:"e.g. 7.5"},
                        {label:"Years",           val:intYears,     set:setIntYears,     ph:"e.g. 5"},
                      ].map(f => (
                        <div key={f.label} style={{marginBottom:12}}>
                          <div style={{fontSize:11,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.07em",fontWeight:700,marginBottom:6}}>{f.label}</div>
                          <input value={f.val} onChange={e=>f.set(e.target.value)} type="number" placeholder={f.ph}
                            style={{width:"100%",boxSizing:"border-box",background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:12,padding:"10px 14px",fontSize:18,fontWeight:700,color:T.text,outline:"none"}}/>
                        </div>
                      ))}
                    </div>
                    {total !== null && (
                      <div style={{background:"linear-gradient(135deg,rgba(20,184,166,0.15),rgba(6,182,212,0.1))",border:"1px solid rgba(20,184,166,0.3)",borderRadius:18,padding:"20px 16px"}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
                          <div>
                            <div style={{fontSize:10,color:"#14B8A6",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em"}}>Interest Earned</div>
                            <div style={{fontSize:30,fontWeight:900,color:"#14B8A6"}}>${interest.toFixed(2)}</div>
                          </div>
                          <div style={{textAlign:"right"}}>
                            <div style={{fontSize:10,color:T.textFaint,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em"}}>Total Amount</div>
                            <div style={{fontSize:30,fontWeight:900,color:T.text}}>${total.toFixed(2)}</div>
                          </div>
                        </div>
                        <div style={{height:1,background:T.border,marginBottom:10}}/>
                        <div style={{fontSize:11,color:T.textFaint}}>{intType === "simple" ? "Simple" : "Compound"} interest on <strong style={{color:T.text}}>${parseFloat(intPrincipal).toLocaleString()}</strong> at <strong style={{color:T.text}}>{intRate}%</strong> for <strong style={{color:T.text}}>{intYears} yr{intYears!=="1"?"s":""}</strong></div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ─── CURRENCY TAB ────────────────────────────────────────*/}
              {calcTab === "currency" && (() => {
                const rate   = currRate || 83.5;
                const amount = parseFloat(currAmount);
                const result = !isNaN(amount)
                  ? (currDir === "usdToInr" ? amount * rate : amount / rate)
                  : null;
                const fromLabel = currDir === "usdToInr" ? "USD 🇺🇸" : "INR 🇮🇳";
                const toLabel   = currDir === "usdToInr" ? "INR 🇮🇳" : "USD 🇺🇸";
                const fromSymbol = currDir === "usdToInr" ? "$" : "₹";
                const toSymbol   = currDir === "usdToInr" ? "₹" : "$";
                return (
                  <div>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                      <div style={{fontSize:13,fontWeight:800,color:T.text}}>📱 Currency Converter</div>
                      <div onClick={fetchCurrRate} style={{fontSize:10,color:"#14B8A6",fontWeight:700,cursor:"pointer",background:"rgba(20,184,166,0.1)",padding:"5px 10px",borderRadius:20}}>
                        {currRateLoading ? "Fetching…" : `↻ Live Rate`}
                      </div>
                    </div>
                    <div style={{background:"rgba(20,184,166,0.08)",border:"1px solid rgba(20,184,166,0.2)",borderRadius:14,padding:"10px 14px",marginBottom:14,fontSize:12,color:T.textMuted}}>
                      1 USD = <strong style={{color:"#14B8A6",fontSize:14}}>₹{rate.toFixed(2)}</strong> INR
                      <span style={{fontSize:10,color:T.textFaint,marginLeft:8}}>via open.er-api.com</span>
                    </div>
                    {/* Direction toggle */}
                    <div style={{display:"flex",gap:6,marginBottom:14}}>
                      {[{id:"usdToInr",label:"USD → INR"},{id:"inrToUsd",label:"INR → USD"}].map(d => (
                        <div key={d.id} onClick={()=>setCurrDir(d.id)} style={{flex:1,textAlign:"center",padding:"9px",borderRadius:14,cursor:"pointer",fontSize:12,fontWeight:700,background:currDir===d.id?"linear-gradient(135deg,#14B8A6,#06B6D4)":(isDark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.06)"),color:currDir===d.id?"#fff":T.textMuted}}>{d.label}</div>
                      ))}
                    </div>
                    <div style={{background:T.bgCard,borderRadius:18,padding:"16px",marginBottom:12,border:`1px solid ${T.border}`}}>
                      <div style={{fontSize:11,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.07em",fontWeight:700,marginBottom:6}}>Amount in {fromLabel}</div>
                      <div style={{position:"relative"}}>
                        <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",fontSize:20,fontWeight:800,color:T.textMuted,pointerEvents:"none"}}>{fromSymbol}</span>
                        <input value={currAmount} onChange={e=>setCurrAmount(e.target.value)} type="number" placeholder="0.00"
                          style={{width:"100%",boxSizing:"border-box",background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:12,padding:"10px 14px 10px 30px",fontSize:26,fontWeight:800,color:T.text,outline:"none"}}/>
                      </div>
                    </div>
                    {result !== null && (
                      <div style={{background:"linear-gradient(135deg,rgba(20,184,166,0.15),rgba(6,182,212,0.1))",border:"1px solid rgba(20,184,166,0.3)",borderRadius:18,padding:"20px 16px",textAlign:"center"}}>
                        <div style={{fontSize:11,color:T.textFaint,marginBottom:4}}>{fromSymbol}{parseFloat(currAmount).toLocaleString()} {fromLabel} =</div>
                        <div style={{fontSize:40,fontWeight:900,color:"#14B8A6"}}>{toSymbol}{result.toLocaleString("en-IN",{maximumFractionDigits:2})}</div>
                        <div style={{fontSize:12,color:T.textMuted,marginTop:4}}>{toLabel}</div>
                      </div>
                    )}
                    {/* Quick amounts */}
                    <div style={{marginTop:14}}>
                      <div style={{fontSize:10,color:T.textFaint,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:8}}>Quick Convert</div>
                      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                        {(currDir==="usdToInr"?[1,5,10,50,100,500,1000]:[100,500,1000,5000,10000,50000,100000]).map(q => (
                          <div key={q} onClick={()=>setCurrAmount(String(q))} style={{padding:"5px 12px",borderRadius:20,background:currAmount==String(q)?"#14B8A6":(isDark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.06)"),color:currAmount==String(q)?"#fff":T.textMuted,fontSize:11,fontWeight:700,cursor:"pointer"}}>
                            {fromSymbol}{q.toLocaleString()}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ─── UNITS TAB ────────────────────────────────────────*/}
              {calcTab === "units" && (() => {
                const cat    = UNIT_CATS[unitCategory];
                const result = convertUnit(unitFrom, unitFromUnit, unitToUnit);
                return (
                  <div>
                    <div style={{fontSize:13,fontWeight:800,color:T.text,marginBottom:12}}>📍 Unit Converter</div>
                    {/* Category pills */}
                    <div style={{display:"flex",gap:6,marginBottom:14}}>
                      {Object.entries(UNIT_CATS).map(([key,val]) => {
                        const a = unitCategory === key;
                        return <div key={key} onClick={()=>{setUnitCategory(key);setUnitFromUnit(val.units[0]);setUnitToUnit(val.units[1]);setUnitFrom("");}} style={{flex:1,textAlign:"center",padding:"8px 4px",borderRadius:20,cursor:"pointer",fontSize:12,fontWeight:a?700:500,background:a?"linear-gradient(135deg,#14B8A6,#06B6D4)":(isDark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.05)"),color:a?"#fff":T.textMuted}}>{val.label}</div>;
                      })}
                    </div>

                    <div style={{background:T.bgCard,borderRadius:18,padding:"16px",marginBottom:12,border:`1px solid ${T.border}`}}>
                      {/* From unit pills */}
                      <div style={{fontSize:10,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.07em",fontWeight:700,marginBottom:8}}>From</div>
                      <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:10}}>
                        {cat.units.map(u => (
                          <div key={u} onClick={()=>setUnitFromUnit(u)} style={{padding:"5px 12px",borderRadius:20,cursor:"pointer",fontSize:11,fontWeight:unitFromUnit===u?700:500,background:unitFromUnit===u?"#14B8A6":(isDark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.06)"),color:unitFromUnit===u?"#fff":T.textMuted}}>{u}</div>
                        ))}
                      </div>
                      <input value={unitFrom} onChange={e=>setUnitFrom(e.target.value)} type="number" placeholder="Enter value"
                        style={{width:"100%",boxSizing:"border-box",background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:12,padding:"10px 14px",fontSize:22,fontWeight:700,color:T.text,outline:"none",marginBottom:14}}/>

                      {/* To unit pills */}
                      <div style={{fontSize:10,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.07em",fontWeight:700,marginBottom:8}}>To</div>
                      <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:10}}>
                        {cat.units.map(u => (
                          <div key={u} onClick={()=>setUnitToUnit(u)} style={{padding:"5px 12px",borderRadius:20,cursor:"pointer",fontSize:11,fontWeight:unitToUnit===u?700:500,background:unitToUnit===u?"#06B6D4":(isDark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.06)"),color:unitToUnit===u?"#fff":T.textMuted}}>{u}</div>
                        ))}
                      </div>
                      {/* Result */}
                      <div style={{background:T.bgInput,border:`1px solid rgba(20,184,166,0.4)`,borderRadius:12,padding:"12px 14px",fontSize:24,fontWeight:800,color:"#14B8A6",minHeight:50,display:"flex",alignItems:"center"}}>
                        {result ? <>{result} <span style={{fontSize:14,fontWeight:600,marginLeft:6,color:"#06B6D4"}}>{unitToUnit}</span></> : <span style={{color:T.textFaint,fontSize:14,fontWeight:400}}>Result will appear here</span>}
                      </div>
                    </div>
                    {/* Swap button */}
                    <div onClick={()=>{const tmp=unitFromUnit;setUnitFromUnit(unitToUnit);setUnitToUnit(tmp);}} style={{textAlign:"center",padding:"10px",cursor:"pointer",fontSize:13,color:"#14B8A6",fontWeight:700}}>⇅ Swap units</div>
                  </div>
                );
              })()}

            </div>


          </>
        )}

        {/* ─── PINGME SCREEN ────────────────────────────────────────*/}
        {mainTab === "ping" && (
          <>
            {/* 1. Not logged in → Google Login */}
            {!pingMe && (
              <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px 24px",position:"relative"}}>
                {/* Back button */}
                <div onClick={()=>setMainTab(null)} style={{position:"absolute",top:12,left:12,cursor:"pointer",display:"flex",alignItems:"center",gap:6,background:isDark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.05)",padding:"8px 16px 8px 10px",borderRadius:24,transition:"background 0.15s ease",zIndex:10}} title="Back to Home"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.textMuted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg><span style={{fontSize:13,fontWeight:700,color:T.textMuted}}>Home</span></div>
                <div style={{width:80,height:80,borderRadius:40,background:"#25D366",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:20}}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </div>
                <div style={{fontSize:26,fontWeight:700,color:T.text,marginBottom:8}}>PingMe</div>
                <div style={{fontSize:13,color:T.textMuted,marginBottom:36,textAlign:"center",lineHeight:1.5}}>Chat with your family members<br/>right inside Pulse</div>
                <div onClick={pingGoogleLogin} style={{display:"flex",alignItems:"center",gap:10,background:"#25D366",borderRadius:28,padding:"14px 32px",cursor:"pointer",boxShadow:"0 2px 12px rgba(37,211,102,0.3)"}}>
                  <span style={{fontSize:15,fontWeight:700,color:"#fff"}}>Agree and Continue</span>
                </div>
              </div>
            )}

            {/* 2. Logged in but needs password (only if encryption enabled) */}
            {pingMe && pingEncryptEnabled && !sessionStorage.getItem("pulse_ping_pass") && pingScreen === "setPassword" && (
              <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px 24px",position:"relative"}}>
                <div onClick={()=>setMainTab(null)} style={{position:"absolute",top:12,left:12,cursor:"pointer",display:"flex",alignItems:"center",gap:6,background:isDark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.05)",padding:"8px 16px 8px 10px",borderRadius:24,transition:"background 0.15s ease",zIndex:10}} title="Back to Home"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.textMuted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg><span style={{fontSize:13,fontWeight:700,color:T.textMuted}}>Home</span></div>
                <div style={{fontSize:36,marginBottom:12}}>🔐</div>
                <div style={{fontSize:18,fontWeight:900,color:T.text,fontFamily:"Georgia,serif",marginBottom:6}}>Set Chat Password</div>
                <div style={{fontSize:12,color:T.textFaint,marginBottom:6,textAlign:"center"}}>This encrypts all your messages with AES-256.</div>
                <div style={{fontSize:11,color:"#FF3B5C",marginBottom:24,textAlign:"center",background:"rgba(255,59,92,0.08)",padding:"8px 12px",borderRadius:10}}>⚠️ If you forget this password, your messages cannot be recovered.</div>
                <div style={{width:"100%",maxWidth:300}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,background:isDark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.04)",borderRadius:12,padding:"8px 12px"}}>
                    <span style={{fontSize:18}}>{pingMe.photo ? <img src={pingMe.photo} style={{width:28,height:28,borderRadius:14}} alt=""/> : "👤"}</span>
                    <div>
                      <div style={{fontSize:12,fontWeight:700,color:T.text}}>{pingMe.name}</div>
                      <div style={{fontSize:10,color:T.textFaint}}>{pingMe.email}</div>
                    </div>
                  </div>
                  <input value={pingPasswordInput} onChange={e=>setPingPasswordInput(e.target.value)} type="password" placeholder="Create a strong password"
                    style={{width:"100%",boxSizing:"border-box",background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:12,padding:"12px 14px",fontSize:14,color:T.text,outline:"none",marginBottom:10}}/>
                  <input value={pingPasswordConfirm} onChange={e=>setPingPasswordConfirm(e.target.value)} type="password" placeholder="Confirm password"
                    style={{width:"100%",boxSizing:"border-box",background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:12,padding:"12px 14px",fontSize:14,color:T.text,outline:"none",marginBottom:16}}/>
                  {pingError && <div style={{fontSize:11,color:"#FF3B5C",textAlign:"center",marginBottom:10}}>{pingError}</div>}
                  <div onClick={()=>{
                    if (!pingPasswordInput) { setPingError("Please enter a password"); return; }
                    if (pingPasswordInput !== pingPasswordConfirm) { setPingError("Passwords don't match"); return; }
                    if (pingPasswordInput.length < 6) { setPingError("Password must be at least 6 characters"); return; }
                    sessionStorage.setItem("pulse_ping_pass", pingPasswordInput);
                    setPingPassword(pingPasswordInput);
                    setPingPasswordInput("");
                    setPingPasswordConfirm("");
                    setPingError("");
                    setPingScreen("home");
                  }} style={{background:"linear-gradient(135deg,#22C55E,#10B981)",borderRadius:16,padding:"13px",textAlign:"center",cursor:"pointer",fontSize:14,fontWeight:800,color:"#fff"}}>
                    Set Password & Start Chatting →
                  </div>
                </div>
              </div>
            )}

            {/* 3. Logged in, encryption enabled, needs password entry this session */}
            {pingMe && pingEncryptEnabled && !sessionStorage.getItem("pulse_ping_pass") && pingScreen !== "setPassword" && (
              <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px 24px",position:"relative"}}>
                <div onClick={()=>setMainTab(null)} style={{position:"absolute",top:12,left:12,cursor:"pointer",display:"flex",alignItems:"center",gap:6,background:isDark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.05)",padding:"8px 16px 8px 10px",borderRadius:24,transition:"background 0.15s ease",zIndex:10}} title="Back to Home"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.textMuted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg><span style={{fontSize:13,fontWeight:700,color:T.textMuted}}>Home</span></div>
                <div style={{fontSize:36,marginBottom:12}}>🔍</div>
                <div style={{fontSize:18,fontWeight:900,color:T.text,fontFamily:"Georgia,serif",marginBottom:6}}>Enter Chat Password</div>
                <div style={{fontSize:12,color:T.textFaint,marginBottom:24,textAlign:"center"}}>Enter your password to decrypt your messages</div>
                <div style={{width:"100%",maxWidth:300}}>
                  <input value={pingPasswordInput} onChange={e=>setPingPasswordInput(e.target.value)} type="password" placeholder="Your chat password"
                    onKeyDown={e=>{if(e.key==="Enter"){sessionStorage.setItem("pulse_ping_pass",pingPasswordInput);setPingPassword(pingPasswordInput);setPingPasswordInput("");}}}
                    style={{width:"100%",boxSizing:"border-box",background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:12,padding:"12px 14px",fontSize:14,color:T.text,outline:"none",marginBottom:14}}/>
                  {pingError && <div style={{fontSize:11,color:"#FF3B5C",textAlign:"center",marginBottom:10}}>{pingError}</div>}
                  <div onClick={()=>{
                    if (!pingPasswordInput) return;
                    sessionStorage.setItem("pulse_ping_pass", pingPasswordInput);
                    setPingPassword(pingPasswordInput);
                    setPingPasswordInput("");
                  }} style={{background:"linear-gradient(135deg,#22C55E,#10B981)",borderRadius:16,padding:"13px",textAlign:"center",cursor:"pointer",fontSize:14,fontWeight:800,color:"#fff"}}>
                    Unlock PingMe 🔒
                  </div>
                  <div onClick={()=>{setPingScreen("setPassword");}} style={{textAlign:"center",fontSize:11,color:T.textFaint,marginTop:12,cursor:"pointer"}}>Forgot password? Set a new one</div>
                </div>
              </div>
            )}

            {/* 4. Fully authenticated — Home (WhatsApp-style) */}
            {pingMe && (pingPassword || !pingEncryptEnabled) && pingScreen === "home" && (
              <>
                {/* WhatsApp-style top bar */}
                <div style={{background:"#40E0D0",padding:"14px 16px 12px",flexShrink:0}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div onClick={()=>setMainTab(null)} style={{cursor:"pointer",display:"flex",alignItems:"center"}}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                      </div>
                      <span style={{fontSize:22,fontWeight:700,color:"#fff",letterSpacing:0.3}}>PingMe</span>
                    </div>
                    <div style={{position:"relative"}}>
                      <div onClick={()=>setPingMenuOpen(!pingMenuOpen)} style={{cursor:"pointer",padding:"4px 2px",display:"flex",alignItems:"center"}}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
                      </div>
                      {pingMenuOpen && (
                        <>
                          <div onClick={()=>setPingMenuOpen(false)} style={{position:"fixed",top:0,left:0,right:0,bottom:0,zIndex:99}}/>
                          <div style={{position:"absolute",top:32,right:0,background:isDark?"#1F2C33":"#fff",borderRadius:8,boxShadow:"0 4px 16px rgba(0,0,0,0.2)",minWidth:180,zIndex:100,overflow:"hidden"}}>
                            <div onClick={()=>{setPingMenuOpen(false);setPingScreen("newGroup");pingLoadUsers();}} style={{padding:"14px 20px",cursor:"pointer",fontSize:14,color:isDark?"#E9EDEF":"#333",borderBottom:`1px solid ${isDark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.08)"}`}}>New Group</div>
                            <div onClick={()=>{setPingMenuOpen(false);}} style={{padding:"14px 20px",cursor:"pointer",fontSize:14,color:isDark?"#E9EDEF":"#333"}}>Invite Members</div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Online contacts strip */}
                {pingUsers.length > 0 && (
                  <div style={{padding:"10px 12px 8px",borderBottom:`1px solid ${T.border}`,background:T.bg,flexShrink:0}}>
                    <div style={{display:"flex",gap:14,overflowX:"auto",paddingBottom:2}}>
                      {pingUsers.map(u=>{
                        const isOnline = pingOnline[u.id] && (Date.now()-pingOnline[u.id])<120000;
                        return (
                          <div key={u.id} onClick={()=>pingOpenDm(u)} style={{flexShrink:0,display:"flex",flexDirection:"column",alignItems:"center",gap:4,cursor:"pointer",width:56}}>
                            <div style={{position:"relative"}}>
                              {u.photo ? <img src={u.photo} style={{width:46,height:46,borderRadius:23,border:"2px solid "+(isOnline?"#25D366":"transparent")}} alt=""/> : <div style={{width:46,height:46,borderRadius:23,background:u.color||"#7C3AED",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,fontWeight:800,color:"#fff",border:"2px solid "+(isOnline?"#25D366":"transparent")}}>{u.name[0]}</div>}
                              {isOnline && <div style={{position:"absolute",bottom:1,right:1,width:11,height:11,borderRadius:6,background:"#25D366",border:"2.5px solid "+T.bg}}/>}
                            </div>
                            <div style={{fontSize:10,color:T.textMuted,maxWidth:56,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textAlign:"center",fontWeight:500}}>{u.name.split(" ")[0]}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Chat list */}
                <div style={{flex:1,overflowY:"auto",position:"relative"}}>
                  {pingGroups.map(g=>(
                    <div key={g.id} onClick={()=>{setPingActiveChat(g);setPingScreen("chat");pingLoadMessages(g);}}
                      style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",cursor:"pointer",borderBottom:`1px solid ${T.border}`}}>
                      <div style={{width:50,height:50,borderRadius:25,background:g.color||"#25D366",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>👥</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:3}}>
                          <div style={{fontSize:15,fontWeight:600,color:T.text}}>{g.name}</div>
                          <div style={{fontSize:11,color:T.textFaint,flexShrink:0}}>Group</div>
                        </div>
                        <div style={{fontSize:13,color:T.textMuted,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{g.members?.length} members</div>
                      </div>
                    </div>
                  ))}
                  {pingUsers.map(u=>{
                    const isOnline = pingOnline[u.id]&&(Date.now()-pingOnline[u.id])<120000;
                    return (
                    <div key={u.id} onClick={()=>pingOpenDm(u)}
                      style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",cursor:"pointer",borderBottom:`1px solid ${T.border}`}}>
                      <div style={{position:"relative"}}>
                        {u.photo ? <img src={u.photo} style={{width:50,height:50,borderRadius:25}} alt=""/> : <div style={{width:50,height:50,borderRadius:25,background:u.color||"#7C3AED",display:"flex",alignItems:"center",justifyContent:"center",fontSize:19,fontWeight:800,color:"#fff"}}>{u.name[0]}</div>}
                        {isOnline&&<div style={{position:"absolute",bottom:2,right:2,width:12,height:12,borderRadius:6,background:"#25D366",border:"2.5px solid "+T.bg}}/>}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:3}}>
                          <div style={{fontSize:15,fontWeight:600,color:T.text}}>{u.name}</div>
                          <div style={{fontSize:11,color:T.textFaint,flexShrink:0}}>{isOnline?"online":""}</div>
                        </div>
                        <div style={{fontSize:13,color:T.textMuted,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{u.email}</div>
                      </div>
                    </div>
                    );
                  })}
                  {pingGroups.length===0&&pingUsers.length===0&&(
                    <div style={{textAlign:"center",padding:"60px 20px"}}>
                      <div style={{fontSize:48,marginBottom:16,opacity:0.4}}>💬</div>
                      <div style={{fontSize:16,fontWeight:600,color:T.text,marginBottom:8}}>No family contacts yet</div>
                      <div style={{fontSize:13,color:T.textFaint,lineHeight:1.5}}>{fwMembers.length > 1 ? "Family members found — they need to open the app once to appear here" : "Go to Settings → Family Workspace to add family members first"}</div>
                    </div>
                  )}


                </div>

              </>
            )}
            {pingMe && pingPassword && pingScreen === "chat" && pingActiveChat && (
              <>
                <div style={{background:"#40E0D0",padding:"8px 12px",flexShrink:0,display:"flex",alignItems:"center",gap:10}}>
                  <button onClick={()=>{setPingScreen("home");setPingActiveChat(null);setPingMessages([]);}} style={{background:"none",border:"none",color:"#fff",padding:"4px",cursor:"pointer",fontSize:14,display:"flex",alignItems:"center"}}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg></button>
                  <div style={{width:38,height:38,borderRadius:19,background:pingActiveChat.color||"#25D366",display:"flex",alignItems:"center",justifyContent:"center",fontSize:pingActiveChat.type==="group"?18:15,fontWeight:800,color:"#fff",flexShrink:0}}>
                    {pingActiveChat.type==="group"?"👥":pingActiveChat.name[0]}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:16,fontWeight:600,color:"#fff",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{pingActiveChat.name}</div>
                    <div style={{fontSize:11,color:"rgba(255,255,255,0.7)"}}>{pingActiveChat.type==="group" ? (pingActiveChat.members?.length+" members") : "tap here for info"}</div>
                  </div>
                  {pingLoading && <div style={{fontSize:10,color:"rgba(255,255,255,0.6)"}}>syncing…</div>}
                </div>
                <div ref={pingMsgRef} style={{flex:1,overflowY:"auto",padding:"8px 12px",display:"flex",flexDirection:"column",gap:4,background:isDark?"#0B141A":"#ECE5DD"}}>
                  {pingMessages.map((m,i)=>{
                    const isMe = m.from===pingMe.email;
                    return (
                      <div key={m.id||i} style={{display:"flex",flexDirection:"column",alignItems:isMe?"flex-end":"flex-start"}}>
                        {pingActiveChat.type==="group"&&!isMe&&<div style={{fontSize:11,color:"#25D366",fontWeight:600,marginBottom:1,marginLeft:8}}>{m.fromName}</div>}
                        <div style={{maxWidth:"80%",background:isMe?(isDark?"#005C4B":"#DCF8C6"):(isDark?"#1F2C33":"#fff"),borderRadius:isMe?"8px 8px 2px 8px":"8px 8px 8px 2px",padding:"6px 10px 4px",boxShadow:"0 1px 1px rgba(0,0,0,0.08)"}}>
                          <div style={{fontSize:14,color:isDark?"#E9EDEF":"#111B21",lineHeight:1.4}}>{m.text}</div>
                          <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:3,marginTop:2}}>
                            <span style={{fontSize:10,color:isDark?"rgba(255,255,255,0.45)":"#667781"}}>{pingTimeStr(m.ts)}</span>
                            {isMe&&<span style={{fontSize:12,color:m.read?"#53BDEB":"#667781"}}>{m.read?"✔✔":"✔"}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {pingMessages.length===0&&!pingLoading&&<div style={{textAlign:"center",color:T.textFaint,fontSize:13,marginTop:40}}>No messages yet — say hi! 👋</div>}
                  {pingLoading&&pingMessages.length===0&&<div style={{textAlign:"center",color:T.textFaint,fontSize:13,marginTop:40}}>Loading messages…</div>}
                </div>
                <div style={{padding:"6px 8px",borderTop:`1px solid ${T.border}`,display:"flex",gap:6,alignItems:"center",flexShrink:0,background:isDark?"#1F2C33":"#F0F2F5"}}>
                  <input value={pingInput} onChange={e=>setPingInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&pingSend()}
                    placeholder="Message"
                    style={{flex:1,background:isDark?"#2A3942":"#fff",border:"none",borderRadius:24,padding:"10px 16px",fontSize:14,color:T.text,outline:"none"}}/>
                  <div onClick={pingSend} style={{width:44,height:44,borderRadius:22,background:"#25D366",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0}}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                  </div>
                </div>
              </>
            )}

            {/* 6. New Group screen */}
            {pingMe && pingPassword && pingScreen === "newGroup" && (
              <>
                <div style={{padding:"12px 16px",borderBottom:`1px solid ${T.border}`,flexShrink:0,display:"flex",alignItems:"center",gap:10}}>
                  <button onClick={()=>setPingScreen("home")} style={{background:isDark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.05)",border:"none",borderRadius:20,color:T.textMuted,padding:"8px 12px",cursor:"pointer",fontSize:14,display:"flex",alignItems:"center"}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg></button>
                  <div style={{fontSize:15,fontWeight:800,color:T.text}}>New Group</div>
                </div>
                <div style={{flex:1,overflowY:"auto",padding:"16px"}}>
                  <div style={{fontSize:11,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.07em",fontWeight:700,marginBottom:6}}>Group Name</div>
                  <input value={pingNewGroup.name} onChange={e=>setPingNewGroup(p=>({...p,name:e.target.value}))} placeholder="e.g. Family, Friends…"
                    style={{width:"100%",boxSizing:"border-box",background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:12,padding:"10px 14px",fontSize:14,color:T.text,outline:"none",marginBottom:16}}/>
                  <div style={{fontSize:10,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.07em",fontWeight:700,marginBottom:8}}>Add Members</div>
                  <div style={{background:"rgba(34,197,94,0.08)",border:"1px solid rgba(34,197,94,0.2)",borderRadius:10,padding:"8px 12px",marginBottom:12,fontSize:11,color:"#22C55E"}}>
                    🔒 A shared Google Drive folder will be created automatically for all members
                  </div>
                  {pingUsers.length===0&&<div style={{fontSize:12,color:T.textFaint,textAlign:"center",padding:"20px 0"}}>No other PingMe users found</div>}
                  <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:20}}>
                    {pingUsers.map(u=>{
                      const sel = pingNewGroup.members.includes(u.email);
                      return (
                        <div key={u.id} onClick={()=>setPingNewGroup(p=>({...p,members:sel?p.members.filter(x=>x!==u.email):[...p.members,u.email]}))}
                          style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:14,background:sel?"rgba(34,197,94,0.1)":T.bgCard,border:`1px solid ${sel?"#22C55E":T.border}`,cursor:"pointer"}}>
                          {u.photo?<img src={u.photo} style={{width:36,height:36,borderRadius:18}} alt=""/>:<div style={{width:36,height:36,borderRadius:18,background:u.color||"#7C3AED",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800,color:"#fff"}}>{u.name[0]}</div>}
                          <div style={{flex:1}}>
                            <div style={{fontSize:13,fontWeight:700,color:T.text}}>{u.name}</div>
                            <div style={{fontSize:10,color:T.textFaint}}>{u.email}</div>
                          </div>
                          <div style={{width:22,height:22,borderRadius:11,border:`2px solid ${sel?"#22C55E":T.border}`,background:sel?"#22C55E":"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#fff"}}>{sel?"✔":""}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div onClick={pingCreateGroup} style={{background:pingNewGroup.name&&pingNewGroup.members.length?"linear-gradient(135deg,#22C55E,#10B981)":"rgba(34,197,94,0.3)",borderRadius:16,padding:"14px",textAlign:"center",cursor:"pointer",fontSize:14,fontWeight:800,color:"#fff"}}>
                    Create Group ({pingNewGroup.members.length} members)
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* ─── CONTACTS SCREEN ────────────────────────────────────────*/}
        {mainTab === "contacts" && (
          <div style={{flex:1,display:"flex",flexDirection:"column",padding:"0 0 100px",animation:"fadeIn 0.3s ease"}}>
            {/* Header */}
            <div style={{padding:"16px 20px 10px",display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
              <div onClick={()=>setMainTab(null)} style={{width:36,height:36,borderRadius:12,background:isDark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.05)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </div>
              <div style={{flex:1}}>
                <h1 style={{fontSize:24,fontWeight:900,color:T.text,margin:0,letterSpacing:"-0.02em"}}>Contacts</h1>
                <div style={{fontSize:10,color:T.textFaint,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase"}}>Family Directory</div>
              </div>
              <div onClick={()=>{setCtEditId(null);setCtName("");setCtPhone("");setCtAddress("");setCtMember(ctSelectedMember!=="all"?ctSelectedMember:"me");setCtShowAdd(true);}} style={{padding:"8px 14px",borderRadius:12,background:"linear-gradient(135deg,#6366F1,#4F46E5)",color:"#fff",fontSize:12,fontWeight:800,cursor:"pointer"}}>+ Add</div>
            </div>

            <div style={{flex:1,overflowY:"auto",padding:"0 16px 20px",WebkitOverflowScrolling:"touch"}}>
              {/* Member Tabs */}
              <div style={{display:"flex",gap:6,marginBottom:14,overflowX:"auto",WebkitOverflowScrolling:"touch",paddingBottom:4}}>
                {(() => {
                  const tabs = [{key:"all",label:"All"}];
                  tabs.push({key:"me",label:fwUser?.name?.split(" ")[0] || "Me"});
                  (fwMembers||[]).filter(m=>m.email!==fwUser?.email).forEach(m=>{
                    tabs.push({key:m.email,label:m.name?.split(" ")[0] || m.email});
                  });
                  return tabs.map(t=>(
                    <div key={t.key} onClick={()=>setCtSelectedMember(t.key)} style={{padding:"7px 16px",borderRadius:20,fontSize:12,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",background:ctSelectedMember===t.key?"linear-gradient(135deg,#6366F1,#4F46E5)":(isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.05)"),color:ctSelectedMember===t.key?"#fff":T.text,transition:"all 0.15s"}}>{t.label}</div>
                  ));
                })()}
              </div>

              {/* Search */}
              <div style={{marginBottom:14}}>
                <input value={ctSearch} onChange={e=>setCtSearch(e.target.value)} placeholder="Search by name, phone, or address..." style={{width:"100%",padding:"10px 14px",borderRadius:14,border:`1px solid ${T.border}`,background:T.bgCard,color:T.text,fontSize:14,boxSizing:"border-box"}}/>
              </div>

              {/* Contact List */}
              {(() => {
                const filtered = ctContacts.filter(c => {
                  if (ctSelectedMember !== "all" && (c.member || "me") !== ctSelectedMember) return false;
                  if (ctSearch) {
                    const s = ctSearch.toLowerCase();
                    return (c.name||"").toLowerCase().includes(s) || (c.phone||"").includes(s) || (c.address||"").toLowerCase().includes(s);
                  }
                  return true;
                });
                if (filtered.length === 0) return (
                  <div style={{textAlign:"center",padding:"40px 20px"}}>
                    <div style={{fontSize:48,marginBottom:12}}>📇</div>
                    <div style={{fontSize:16,fontWeight:800,color:T.text,marginBottom:4}}>{ctSearch ? "No matches found" : "No contacts yet"}</div>
                    <div style={{fontSize:12,color:T.textFaint}}>{ctSearch ? "Try a different search" : "Tap + Add to save a contact"}</div>
                  </div>
                );

                const memberNames = {"me": fwUser?.name || "Me"};
                (fwMembers||[]).forEach(m => { if (m.email !== fwUser?.email) memberNames[m.email] = m.name || m.email; });

                return filtered.map(c => {
                  const ownerName = memberNames[c.member||"me"] || c.member;
                  return (
                  <div key={c.id} style={{background:T.bgCard,borderRadius:14,border:`1px solid ${T.border}`,padding:"12px 14px",marginBottom:8}}>
                    <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                      <div style={{width:40,height:40,borderRadius:12,background:"rgba(99,102,241,0.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:800,color:"#6366F1",flexShrink:0}}>
                        {c.name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:14,fontWeight:800,color:T.text}}>{c.name}</div>
                        {c.phone && (
                        <div style={{fontSize:12,color:T.textFaint,marginTop:2,display:"flex",alignItems:"center",gap:4}}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.textFaint} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                          {c.phone}
                        </div>
                        )}
                        {c.address && (
                          <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.address)}`} target="_blank" rel="noopener noreferrer" style={{fontSize:11,color:"#3B82F6",marginTop:3,display:"flex",alignItems:"flex-start",gap:4,textDecoration:"none",cursor:"pointer"}}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,marginTop:1}}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                            <span>{c.address}</span>
                          </a>
                        )}
                        {ctSelectedMember === "all" && <div style={{fontSize:9,color:"#6366F1",fontWeight:700,marginTop:3}}>{ownerName}'s contact</div>}
                      </div>
                      <div style={{display:"flex",gap:5,flexShrink:0}}>
                        {c.phone && (
                        <a href={"tel:"+c.phone} style={{width:30,height:30,borderRadius:8,background:"rgba(34,197,94,0.1)",display:"flex",alignItems:"center",justifyContent:"center",textDecoration:"none"}}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                        </a>
                        )}
                        <div onClick={()=>ctEditContact(c)} style={{width:30,height:30,borderRadius:8,background:"rgba(99,102,241,0.1)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </div>
                        <div onClick={()=>ctDeleteContact(c.id)} style={{width:30,height:30,borderRadius:8,background:"rgba(239,68,68,0.1)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </div>
                      </div>
                    </div>
                  </div>
                  );
                });
              })()}
            </div>

            {/* Add/Edit Contact Modal */}
            {ctShowAdd && (
              <div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={()=>{setCtShowAdd(false);setCtEditId(null);}}>
                <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:420,background:T.bg,borderRadius:"24px 24px 0 0",padding:"20px 20px max(40px,calc(40px + env(safe-area-inset-bottom,0px)))",maxHeight:"85vh",overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
                  <div style={{width:40,height:4,borderRadius:2,background:T.border,margin:"0 auto 16px"}}/>
                  <h2 style={{fontSize:20,fontWeight:900,color:T.text,margin:"0 0 14px"}}>{ctEditId ? "Edit Contact" : "Add Contact"}</h2>

                  {/* Family Member */}
                  <div style={{marginBottom:14}}>
                    <div style={{fontSize:10,fontWeight:700,color:T.textFaint,textTransform:"uppercase",marginBottom:6}}>For Family Member</div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      <div onClick={()=>setCtMember("me")} style={{padding:"8px 14px",borderRadius:12,fontSize:11,fontWeight:700,cursor:"pointer",background:ctMember==="me"?"#6366F1":(isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.05)"),color:ctMember==="me"?"#fff":T.text}}>{fwUser?.name?.split(" ")[0] || "Me"}</div>
                      {(fwMembers||[]).filter(m=>m.email!==fwUser?.email).map(m=>(
                        <div key={m.email} onClick={()=>setCtMember(m.email)} style={{padding:"8px 14px",borderRadius:12,fontSize:11,fontWeight:700,cursor:"pointer",background:ctMember===m.email?"#6366F1":(isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.05)"),color:ctMember===m.email?"#fff":T.text}}>{m.name?.split(" ")[0] || m.email}</div>
                      ))}
                    </div>
                  </div>

                  {/* Name */}
                  <div style={{marginBottom:12}}>
                    <div style={{fontSize:10,fontWeight:700,color:T.textFaint,textTransform:"uppercase",marginBottom:6}}>Friend's Name *</div>
                    <input value={ctName} onChange={e=>setCtName(e.target.value)} placeholder="e.g. John Smith" style={{width:"100%",padding:"10px 14px",borderRadius:12,border:`1px solid ${T.border}`,background:T.bgCard,color:T.text,fontSize:14,boxSizing:"border-box"}}/>
                  </div>

                  {/* Phone */}
                  <div style={{marginBottom:12}}>
                    <div style={{fontSize:10,fontWeight:700,color:T.textFaint,textTransform:"uppercase",marginBottom:6}}>Phone</div>
                    <input value={ctPhone} onChange={e=>setCtPhone(e.target.value)} placeholder="Phone number" type="tel" style={{width:"100%",padding:"10px 14px",borderRadius:12,border:`1px solid ${T.border}`,background:T.bgCard,color:T.text,fontSize:14,boxSizing:"border-box"}}/>
                  </div>

                  {/* Address */}
                  <div style={{marginBottom:16}}>
                    <div style={{fontSize:10,fontWeight:700,color:T.textFaint,textTransform:"uppercase",marginBottom:6}}>Address</div>
                    <textarea value={ctAddress} onChange={e=>setCtAddress(e.target.value)} placeholder="Street, City, State, ZIP" rows={2} style={{width:"100%",padding:"10px 14px",borderRadius:12,border:`1px solid ${T.border}`,background:T.bgCard,color:T.text,fontSize:14,resize:"none",boxSizing:"border-box"}}/>
                  </div>

                  <div onClick={ctSaveContact} style={{width:"100%",padding:"14px",borderRadius:14,background:"linear-gradient(135deg,#6366F1,#4F46E5)",color:"#fff",fontSize:15,fontWeight:800,textAlign:"center",cursor:"pointer",boxSizing:"border-box"}}>{ctEditId ? "Update Contact" : "Save Contact"}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── SECURE FOLDER SCREEN ────────────────────────────────────────*/}
        {mainTab === "securefolder" && (
          <div style={{flex:1,display:"flex",flexDirection:"column",padding:"0 0 100px",animation:"fadeIn 0.3s ease"}}>
            {/* Header */}
            <div style={{padding:"14px 16px 10px",borderBottom:`1px solid ${T.border}`,flexShrink:0}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:sfUnlocked?12:0}}>
                <div onClick={()=>{goHome();sfLock();}} style={{cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",width:36,height:36,borderRadius:18,background:isDark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.05)",flexShrink:0}} title="Back"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={T.textMuted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg></div>
                <div style={{textAlign:"center"}}>
                  <h2 style={{fontSize:22,fontWeight:900,color:T.text,fontFamily:"Georgia,serif",letterSpacing:"-0.02em",margin:0}}>🔒 Secure Vault</h2>
                  <div style={{fontSize:11,color:T.textFaint,marginTop:2}}>{sfUnlocked?"PIN Protected · Encrypted":"Enter PIN to unlock"}</div>
                </div>
                {sfUnlocked ? (
                  <div style={{display:"flex",gap:6}}>
                    <div onClick={()=>setSfChangingPin(v=>!v)} style={{background:"rgba(59,130,246,0.15)",borderRadius:14,padding:"9px 10px",cursor:"pointer",fontSize:11,fontWeight:700,color:"#3B82F6"}}>🔑</div>
                    <div onClick={sfLock} style={{background:"rgba(239,68,68,0.15)",borderRadius:14,padding:"9px 12px",cursor:"pointer",fontSize:12,fontWeight:700,color:"#EF4444"}}>🔒</div>
                    <div onClick={()=>{sfResetForm();setSfTab(sfTab);setSfShowAdd(true);}} style={{background:"linear-gradient(135deg,#EF4444,#DC2626)",borderRadius:14,padding:"9px 16px",cursor:"pointer",fontSize:13,fontWeight:700,color:"#fff"}}>+ Add</div>
                  </div>
                ) : <div style={{width:36}}/>}
              </div>
              {sfUnlocked && (
                <div style={{display:"flex",gap:6,marginBottom:8}}>
                  {[{id:"bank",label:"🏦 Bank Accounts"},{id:"login",label:"🔑 Logins"}].map(t=>(
                    <div key={t.id} onClick={()=>{setSfTab(t.id);setSfChangingPin(false);setSfNewPin("");setSfPinError("");}} style={{flex:1,padding:"8px 12px",borderRadius:14,fontSize:12,fontWeight:700,cursor:"pointer",textAlign:"center",background:sfTab===t.id?"#EF4444":(isDark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.05)"),color:sfTab===t.id?"#fff":T.textMuted,transition:"all 0.15s"}}>{t.label}</div>
                  ))}
                </div>
              )}
              {sfUnlocked && (
                <input value={sfSearch} onChange={e=>setSfSearch(e.target.value)} placeholder="Search..." style={{width:"100%",background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:12,padding:"10px 14px",fontSize:13,color:T.text,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
              )}
            </div>

            {/* PIN change success */}
            {sfPinSuccess && <div style={{textAlign:"center",padding:"8px 14px",fontSize:12,fontWeight:700,color:"#22C55E"}}>{sfPinSuccess}</div>}

            {/* Change PIN panel */}
            {sfUnlocked && sfChangingPin && (
              <div style={{margin:"0 14px 10px",background:isDark?"rgba(59,130,246,0.08)":"rgba(59,130,246,0.05)",border:"1px solid rgba(59,130,246,0.25)",borderRadius:16,padding:"14px"}}>
                <div style={{fontSize:13,fontWeight:800,color:"#3B82F6",marginBottom:8}}>🔑 Change PIN</div>
                <input type="password" inputMode="numeric" value={sfNewPin} onChange={e=>setSfNewPin(e.target.value.replace(/\D/g,""))} onKeyDown={e=>e.key==="Enter"&&sfChangePin()} placeholder="Enter new PIN (4+ digits)" autoFocus style={{width:"100%",background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:12,padding:"12px 14px",fontSize:14,color:T.text,outline:"none",fontFamily:"inherit",boxSizing:"border-box",marginBottom:8,letterSpacing:6,textAlign:"center"}}/>
                {sfPinError && <div style={{fontSize:11,color:"#EF4444",fontWeight:700,marginBottom:6}}>{sfPinError}</div>}
                <div style={{display:"flex",gap:8}}>
                  <div onClick={()=>{setSfChangingPin(false);setSfNewPin("");setSfPinError("");}} style={{flex:1,padding:"10px",borderRadius:12,textAlign:"center",cursor:"pointer",fontSize:12,fontWeight:700,background:isDark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.05)",color:T.textMuted}}>Cancel</div>
                  <div onClick={sfChangePin} style={{flex:1,padding:"10px",borderRadius:12,textAlign:"center",cursor:sfNewPin.length>=4?"pointer":"default",fontSize:12,fontWeight:800,background:sfNewPin.length>=4?"#3B82F6":"rgba(59,130,246,0.3)",color:"#fff"}}>Save New PIN</div>
                </div>
              </div>
            )}

            {/* PIN Lock Screen */}
            {!sfUnlocked && !sfRecovering && (
              <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 30px"}}>
                <div style={{fontSize:64,marginBottom:16}}>{sfGetPin()?"🔐":"🔓"}</div>
                <div style={{fontSize:18,fontWeight:800,color:T.text,marginBottom:6}}>{sfGetPin()?"Enter Your PIN":"Create a PIN"}</div>
                <div style={{fontSize:12,color:T.textFaint,marginBottom:24,textAlign:"center"}}>{sfGetPin()?"Enter your 4+ digit PIN to access your secure vault":"Set a PIN (4+ digits) to protect your passwords & bank details"}</div>
                <div style={{display:"flex",gap:8,marginBottom:16}}>
                  {[...Array(6)].map((_,i)=>(
                    <div key={i} style={{width:16,height:16,borderRadius:8,background:sfPinInput.length>i?"#EF4444":(isDark?"rgba(255,255,255,0.15)":"rgba(0,0,0,0.1)"),transition:"all 0.15s"}}/>
                  ))}
                </div>
                <input
                  type="password"
                  inputMode="numeric"
                  value={sfPinInput}
                  onChange={e=>setSfPinInput(e.target.value.replace(/\D/g,""))}
                  onKeyDown={e=>e.key==="Enter"&&sfUnlock(sfPinInput)}
                  placeholder="PIN"
                  autoFocus
                  style={{width:180,textAlign:"center",background:T.bgInput,border:`2px solid ${sfPinError?"#EF4444":T.border}`,borderRadius:16,padding:"14px",fontSize:24,fontWeight:800,color:T.text,outline:"none",fontFamily:"inherit",letterSpacing:12,boxSizing:"border-box"}}
                />
                {sfPinError && <div style={{color:"#EF4444",fontSize:12,fontWeight:700,marginTop:8}}>{sfPinError}</div>}
                <div onClick={()=>sfUnlock(sfPinInput)} style={{marginTop:16,background:sfPinInput.length>=4?"linear-gradient(135deg,#EF4444,#DC2626)":"rgba(239,68,68,0.3)",borderRadius:16,padding:"14px 40px",cursor:sfPinInput.length>=4?"pointer":"default",fontSize:15,fontWeight:800,color:"#fff",transition:"all 0.2s"}}>{sfGetPin()?"Unlock":"Create PIN"}</div>
                {sfGetPin() && (
                  <div onClick={()=>sfSendOtp()} style={{marginTop:20,fontSize:12,color:T.textFaint,cursor:"pointer",textDecoration:"underline"}}>
                    {sfOtpSending ? "Sending OTP..." : "Forgot PIN?"}
                  </div>
                )}
              </div>
            )}

            {/* OTP Recovery Screen */}
            {!sfUnlocked && sfRecovering && (
              <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 30px"}}>
                {!sfOtpVerified ? (
                  <>
                    <div style={{fontSize:52,marginBottom:16}}>📧</div>
                    <div style={{fontSize:18,fontWeight:800,color:T.text,marginBottom:6}}>Verify Your Identity</div>
                    <div style={{fontSize:12,color:T.textFaint,marginBottom:8,textAlign:"center"}}>A 6-digit OTP has been sent to</div>
                    <div style={{fontSize:13,fontWeight:700,color:"#3B82F6",marginBottom:24}}>{fwUser?.email || "your email"}</div>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={sfOtpInput}
                      onChange={e=>setSfOtpInput(e.target.value.replace(/\D/g,"").slice(0,6))}
                      onKeyDown={e=>e.key==="Enter"&&sfOtpInput.length===6&&sfVerifyOtp()}
                      placeholder="Enter 6-digit OTP"
                      autoFocus
                      style={{width:220,textAlign:"center",background:T.bgInput,border:`2px solid ${sfPinError?"#EF4444":T.border}`,borderRadius:16,padding:"14px",fontSize:22,fontWeight:800,color:T.text,outline:"none",fontFamily:"inherit",letterSpacing:8,boxSizing:"border-box"}}
                    />
                    {sfPinError && <div style={{color:"#EF4444",fontSize:12,fontWeight:700,marginTop:8}}>{sfPinError}</div>}
                    <div onClick={()=>sfOtpInput.length===6&&sfVerifyOtp()} style={{marginTop:16,background:sfOtpInput.length===6?"linear-gradient(135deg,#3B82F6,#2563EB)":"rgba(59,130,246,0.3)",borderRadius:16,padding:"14px 40px",cursor:sfOtpInput.length===6?"pointer":"default",fontSize:15,fontWeight:800,color:"#fff",transition:"all 0.2s"}}>Verify OTP</div>
                    <div style={{display:"flex",gap:20,marginTop:20}}>
                      <div onClick={()=>sfSendOtp()} style={{fontSize:12,color:"#3B82F6",cursor:"pointer",textDecoration:"underline"}}>{sfOtpSending?"Sending...":"Resend OTP"}</div>
                      <div onClick={sfCancelRecovery} style={{fontSize:12,color:T.textFaint,cursor:"pointer",textDecoration:"underline"}}>Cancel</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{fontSize:52,marginBottom:16}}>✅</div>
                    <div style={{fontSize:18,fontWeight:800,color:"#22C55E",marginBottom:6}}>Identity Verified</div>
                    <div style={{fontSize:12,color:T.textFaint,marginBottom:24,textAlign:"center"}}>Set a new PIN for your Secure Vault.<br/>Your existing data will be preserved.</div>
                    <input
                      type="password"
                      inputMode="numeric"
                      value={sfResetPin}
                      onChange={e=>setSfResetPin(e.target.value.replace(/\D/g,""))}
                      onKeyDown={e=>e.key==="Enter"&&sfResetPin.length>=4&&sfResetPinWithOtp()}
                      placeholder="New PIN (4+ digits)"
                      autoFocus
                      style={{width:200,textAlign:"center",background:T.bgInput,border:`2px solid ${sfPinError?"#EF4444":T.border}`,borderRadius:16,padding:"14px",fontSize:24,fontWeight:800,color:T.text,outline:"none",fontFamily:"inherit",letterSpacing:10,boxSizing:"border-box"}}
                    />
                    {sfPinError && <div style={{color:"#EF4444",fontSize:12,fontWeight:700,marginTop:8}}>{sfPinError}</div>}
                    <div onClick={()=>sfResetPin.length>=4&&sfResetPinWithOtp()} style={{marginTop:16,background:sfResetPin.length>=4?"linear-gradient(135deg,#22C55E,#16A34A)":"rgba(34,197,94,0.3)",borderRadius:16,padding:"14px 40px",cursor:sfResetPin.length>=4?"pointer":"default",fontSize:15,fontWeight:800,color:"#fff",transition:"all 0.2s"}}>Set New PIN</div>
                    <div onClick={sfCancelRecovery} style={{marginTop:16,fontSize:12,color:T.textFaint,cursor:"pointer",textDecoration:"underline"}}>Cancel</div>
                  </>
                )}
              </div>
            )}

            {/* Items List */}
            {sfUnlocked && (
              <div style={{flex:1,overflowY:"auto",padding:"12px 14px 16px"}}>
                {(() => {
                  const search = sfSearch.toLowerCase();
                  const filtered = sfItems.filter(i => i.type === sfTab && (
                    sfTab === "bank"
                      ? (i.bankName||"").toLowerCase().includes(search) || (i.accHolder||"").toLowerCase().includes(search) || (i.accNo||"").includes(search)
                      : (i.siteName||"").toLowerCase().includes(search) || (i.username||"").toLowerCase().includes(search)
                  ));

                  if (filtered.length === 0) return (
                    <div style={{textAlign:"center",paddingTop:50}}>
                      <div style={{fontSize:52,marginBottom:12}}>{sfTab==="bank"?"🏦":"🔑"}</div>
                      <div style={{fontSize:16,fontWeight:700,color:T.text,marginBottom:6}}>{sfTab==="bank"?"No bank accounts saved":"No login credentials saved"}</div>
                      <div style={{fontSize:13,color:T.textFaint,marginBottom:20}}>Tap + Add to save {sfTab==="bank"?"a bank account":"login credentials"}</div>
                    </div>
                  );

                  return filtered.map((item, idx) => (
                    <div key={item.id} onClick={()=>setSfViewItem(item)} style={{background:T.bgCard,borderRadius:18,padding:"14px 16px",marginBottom:10,border:`1px solid ${T.border}`,borderLeft:"3px solid #EF4444",animation:`slideUp 0.25s ease ${idx*0.04}s both`,cursor:"pointer"}}>
                      {item.type === "bank" ? (
                        <>
                          <div style={{fontSize:15,fontWeight:800,color:T.text,marginBottom:4}}>{item.country==="US"?"🇺🇸":"🇮🇳"} {item.bankName}</div>
                          <div style={{fontSize:12,color:T.textFaint,fontWeight:600}}>{item.accHolder}</div>
                        </>
                      ) : (
                        <>
                          <div style={{fontSize:15,fontWeight:800,color:T.text,marginBottom:4}}>🔑 {item.siteName}</div>
                          <div style={{fontSize:12,color:T.textFaint,fontWeight:600}}>{item.username}</div>
                        </>
                      )}
                    </div>
                  ));
                })()}
              </div>
            )}

            {/* Add/Edit Modal */}
            {sfViewItem && sfUnlocked && (
              <div style={{position:"fixed",inset:0,zIndex:250,background:isDark?"rgba(0,0,0,0.75)":"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={()=>setSfViewItem(null)}>
                <div onClick={e=>e.stopPropagation()} style={{background:isDark?"#1a1c22":"#fff",borderRadius:24,padding:"24px 20px 20px",width:"100%",maxWidth:380,border:`1px solid ${T.border}`,boxShadow:"0 20px 60px rgba(0,0,0,0.3)",animation:"popIn 0.25s ease",position:"relative"}}>
                  {/* Edit & Delete top-right */}
                  <div style={{position:"absolute",top:16,right:16,display:"flex",gap:6}}>
                    <div onClick={()=>{sfEditItem(sfViewItem);setSfViewItem(null);}} style={{fontSize:14,cursor:"pointer",color:"#3B82F6",padding:"6px 8px",background:"rgba(59,130,246,0.1)",borderRadius:10}}>✏️</div>
                    <div onClick={()=>{sfDeleteItem(sfViewItem.id);setSfViewItem(null);}} style={{fontSize:14,cursor:"pointer",color:"#EF4444",padding:"6px 8px",background:"rgba(239,68,68,0.1)",borderRadius:10}}>🗑️</div>
                  </div>
                  {sfViewItem.type==="bank" ? (
                    <>
                      <div style={{textAlign:"center",marginBottom:16}}>
                        <div style={{fontSize:40,marginBottom:8}}>{sfViewItem.country==="US"?"🇺🇸":"🇮🇳"}</div>
                        <div style={{fontSize:20,fontWeight:900,color:T.text}}>{sfViewItem.bankName}</div>
                        <div style={{fontSize:11,color:T.textFaint,marginTop:4}}>{sfViewItem.country==="US"?"US Bank Account":"Indian Bank Account"} · {sfViewItem.accType}</div>
                      </div>
                      <div style={{background:isDark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.02)",borderRadius:16,padding:"14px 16px",marginBottom:12}}>
                        {[{label:"Account Holder",val:sfViewItem.accHolder},{label:"Account Number",val:sfViewItem.accNo,mono:true,sensitive:true},{label:sfViewItem.country==="US"?"Routing Number":"IFSC Code",val:sfViewItem.country==="US"?sfViewItem.routingNo:sfViewItem.ifsc,mono:true},{label:"Account Type",val:sfViewItem.accType},...((!sfViewItem.country||sfViewItem.country==="IN")&&sfViewItem.upi?[{label:"UPI ID",val:sfViewItem.upi}]:[]),...(sfViewItem.bankUserId?[{label:"User ID / Login",val:sfViewItem.bankUserId}]:[]),...(sfViewItem.regEmail?[{label:"Registered Email",val:sfViewItem.regEmail}]:[]),...(sfViewItem.bankPassword?[{label:"Online Password",val:sfViewItem.bankPassword,sensitive:true}]:[]),...(sfViewItem.notes?[{label:"Notes",val:sfViewItem.notes,italic:true}]:[])].filter(r=>r.val).map((row,i)=>(
                          <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:i<5?`1px solid ${isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.06)"}`:`none`}}>
                            <div style={{fontSize:11,color:T.textFaint,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em"}}>{row.label}</div>
                            <div style={{fontSize:13,fontWeight:700,color:T.text,fontFamily:row.mono?"monospace":"inherit",letterSpacing:row.mono?1:0,fontStyle:row.italic?"italic":"normal",textAlign:"right",maxWidth:"60%",wordBreak:"break-all"}}>
                              {row.sensitive ? (sfShowPw[sfViewItem.id+"_detail"] ? row.val : row.val.replace(/./g,"•").slice(0,-4)+row.val.slice(-4)) : row.val}
                              {row.sensitive && <span onClick={(e)=>{e.stopPropagation();setSfShowPw(p=>({...p,[sfViewItem.id+"_detail"]:!p[sfViewItem.id+"_detail"]}));}} style={{fontSize:10,cursor:"pointer",color:"#3B82F6",marginLeft:6}}>{sfShowPw[sfViewItem.id+"_detail"]?"Hide":"Show"}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{textAlign:"center",marginBottom:16}}>
                        <div style={{fontSize:40,marginBottom:8}}>🔑</div>
                        <div style={{fontSize:20,fontWeight:900,color:T.text}}>{sfViewItem.siteName}</div>
                        {sfViewItem.url && <a href={sfViewItem.url.startsWith("http")?sfViewItem.url:`https://${sfViewItem.url}`} target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:"#3B82F6",textDecoration:"none"}}>{sfViewItem.url}</a>}
                      </div>
                      <div style={{background:isDark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.02)",borderRadius:16,padding:"14px 16px",marginBottom:12}}>
                        {[{label:"Username / Email",val:sfViewItem.username},{label:"Password",val:sfViewItem.password,mono:true,sensitive:true},...(sfViewItem.url?[{label:"Website",val:sfViewItem.url}]:[]),...(sfViewItem.notes?[{label:"Notes",val:sfViewItem.notes,italic:true}]:[])].filter(r=>r.val).map((row,i)=>(
                          <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:i<3?`1px solid ${isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.06)"}`:`none`}}>
                            <div style={{fontSize:11,color:T.textFaint,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em"}}>{row.label}</div>
                            <div style={{fontSize:13,fontWeight:700,color:T.text,fontFamily:row.mono?"monospace":"inherit",letterSpacing:row.mono?1:0,fontStyle:row.italic?"italic":"normal",textAlign:"right",maxWidth:"60%",wordBreak:"break-all"}}>
                              {row.sensitive ? (sfShowPw[sfViewItem.id+"_detail"] ? row.val : "••••••••") : row.val}
                              {row.sensitive && <span onClick={(e)=>{e.stopPropagation();setSfShowPw(p=>({...p,[sfViewItem.id+"_detail"]:!p[sfViewItem.id+"_detail"]}));}} style={{fontSize:10,cursor:"pointer",color:"#3B82F6",marginLeft:6}}>{sfShowPw[sfViewItem.id+"_detail"]?"Hide":"Show"}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  <div onClick={()=>setSfViewItem(null)} style={{padding:"12px",borderRadius:14,textAlign:"center",cursor:"pointer",fontSize:13,fontWeight:700,background:isDark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.05)",color:T.textMuted}}>Close</div>
                </div>
              </div>
            )}
            {sfShowAdd && sfUnlocked && (
              <div style={{position:"absolute",inset:0,zIndex:200,background:isDark?"rgba(0,0,0,0.7)":"rgba(0,0,0,0.4)",display:"flex",flexDirection:"column",justifyContent:"flex-end"}} onClick={()=>sfResetForm()}>
                <div style={{background:isDark?"#13151A":"#fff",borderRadius:"24px 24px 0 0",padding:"20px 18px max(36px,calc(36px + env(safe-area-inset-bottom,0px)))",border:`1px solid ${T.border}`,maxHeight:"85%",overflowY:"auto",WebkitOverflowScrolling:"touch"}} onClick={e=>e.stopPropagation()}>
                  <div style={{width:36,height:4,background:isDark?"rgba(255,255,255,0.2)":"rgba(0,0,0,0.15)",borderRadius:2,margin:"0 auto 16px"}}/>
                  <div style={{fontSize:15,fontWeight:800,color:T.text,marginBottom:14}}>🔒 {sfEditId?"Edit":"Add"} {sfTab==="bank"?"Bank Account":"Login Credential"}</div>

                  {/* Type toggle */}
                  <div style={{display:"flex",gap:6,marginBottom:14}}>
                    {[{id:"bank",label:"🏦 Bank Account"},{id:"login",label:"🔑 Login"}].map(t=>(
                      <div key={t.id} onClick={()=>setSfTab(t.id)} style={{flex:1,padding:"8px",borderRadius:12,fontSize:12,fontWeight:700,cursor:"pointer",textAlign:"center",background:sfTab===t.id?"#EF4444":(isDark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.05)"),color:sfTab===t.id?"#fff":T.textMuted}}>{t.label}</div>
                    ))}
                  </div>

                  {sfTab === "bank" ? (
                    <>
                      {/* Country Toggle */}
                      <div style={{display:"flex",gap:6,marginBottom:14}}>
                        {[{id:"IN",label:"🇮🇳 India"},{id:"US",label:"🇺🇸 USA"}].map(c=>(
                          <div key={c.id} onClick={()=>{setSfBankCountry(c.id);setSfAccType(c.id==="IN"?"Savings":"Checking");}} style={{flex:1,padding:"9px 8px",borderRadius:12,fontSize:12,fontWeight:700,cursor:"pointer",textAlign:"center",background:sfBankCountry===c.id?"#F59E0B":(isDark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.05)"),color:sfBankCountry===c.id?"#fff":T.textMuted,transition:"all 0.15s"}}>{c.label}</div>
                        ))}
                      </div>

                      <div style={{fontSize:11,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.07em",fontWeight:700,marginBottom:6}}>Bank Name *</div>
                      <input value={sfBankName} onChange={e=>setSfBankName(e.target.value)} placeholder={sfBankCountry==="IN"?"e.g. State Bank of India":"e.g. Chase, Bank of America"} style={{width:"100%",background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:12,padding:"12px 14px",fontSize:14,color:T.text,outline:"none",fontFamily:"inherit",marginBottom:12,boxSizing:"border-box"}}/>

                      <div style={{fontSize:11,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.07em",fontWeight:700,marginBottom:6}}>Account Holder</div>
                      <input value={sfAccHolder} onChange={e=>setSfAccHolder(e.target.value)} placeholder="e.g. Sudhakar C" style={{width:"100%",background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:12,padding:"12px 14px",fontSize:14,color:T.text,outline:"none",fontFamily:"inherit",marginBottom:12,boxSizing:"border-box"}}/>

                      <div style={{fontSize:11,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.07em",fontWeight:700,marginBottom:6}}>Account Number *</div>
                      <input value={sfAccNo} onChange={e=>setSfAccNo(e.target.value)} placeholder={sfBankCountry==="IN"?"e.g. 1234567890":"e.g. 123456789012"} type="password" style={{width:"100%",background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:12,padding:"12px 14px",fontSize:14,color:T.text,outline:"none",fontFamily:"inherit",marginBottom:12,boxSizing:"border-box",letterSpacing:2}}/>

                      <div style={{display:"flex",gap:8,marginBottom:12}}>
                        <div style={{flex:1}}>
                          <div style={{fontSize:11,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.07em",fontWeight:700,marginBottom:6}}>{sfBankCountry==="IN"?"IFSC Code":"Routing Number"}</div>
                          {sfBankCountry==="IN" ? (
                            <input value={sfIfsc} onChange={e=>setSfIfsc(e.target.value.toUpperCase())} placeholder="e.g. SBIN0001234" style={{width:"100%",background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:12,padding:"12px 14px",fontSize:14,color:T.text,outline:"none",fontFamily:"inherit",boxSizing:"border-box",textTransform:"uppercase"}}/>
                          ) : (
                            <input value={sfRoutingNo} onChange={e=>setSfRoutingNo(e.target.value.replace(/\D/g,"").slice(0,9))} placeholder="e.g. 021000021" maxLength={9} style={{width:"100%",background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:12,padding:"12px 14px",fontSize:14,color:T.text,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
                          )}
                        </div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:11,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.07em",fontWeight:700,marginBottom:6}}>Account Type</div>
                          <div style={{display:"flex",gap:4}}>
                            {(sfBankCountry==="IN"?["Savings","Current"]:["Checking","Savings"]).map(t=>(
                              <div key={t} onClick={()=>setSfAccType(t)} style={{flex:1,padding:"10px 4px",borderRadius:10,fontSize:12,fontWeight:700,cursor:"pointer",textAlign:"center",background:sfAccType===t?"#EF4444":(isDark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.05)"),color:sfAccType===t?"#fff":T.textMuted}}>{t}</div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {sfBankCountry==="IN" && (
                        <>
                          <div style={{fontSize:11,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.07em",fontWeight:700,marginBottom:6}}>UPI ID (optional)</div>
                          <input value={sfUpi} onChange={e=>setSfUpi(e.target.value)} placeholder="e.g. name@upi" style={{width:"100%",background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:12,padding:"12px 14px",fontSize:14,color:T.text,outline:"none",fontFamily:"inherit",marginBottom:12,boxSizing:"border-box"}}/>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <div style={{fontSize:11,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.07em",fontWeight:700,marginBottom:6}}>Site / App Name *</div>
                      <input value={sfSiteName} onChange={e=>setSfSiteName(e.target.value)} placeholder="e.g. Gmail, Netflix, Amazon" style={{width:"100%",background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:12,padding:"12px 14px",fontSize:14,color:T.text,outline:"none",fontFamily:"inherit",marginBottom:12,boxSizing:"border-box"}}/>

                      <div style={{fontSize:11,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.07em",fontWeight:700,marginBottom:6}}>Username / Email *</div>
                      <input value={sfUsername} onChange={e=>setSfUsername(e.target.value)} placeholder="e.g. user@gmail.com" style={{width:"100%",background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:12,padding:"12px 14px",fontSize:14,color:T.text,outline:"none",fontFamily:"inherit",marginBottom:12,boxSizing:"border-box"}}/>

                      <div style={{fontSize:11,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.07em",fontWeight:700,marginBottom:6}}>Password *</div>
                      <input value={sfPassword} onChange={e=>setSfPassword(e.target.value)} placeholder="Enter password" type="password" style={{width:"100%",background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:12,padding:"12px 14px",fontSize:14,color:T.text,outline:"none",fontFamily:"inherit",marginBottom:12,boxSizing:"border-box"}}/>

                      <div style={{fontSize:11,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.07em",fontWeight:700,marginBottom:6}}>Website URL (optional)</div>
                      <input value={sfUrl} onChange={e=>setSfUrl(e.target.value)} placeholder="e.g. gmail.com" style={{width:"100%",background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:12,padding:"12px 14px",fontSize:14,color:T.text,outline:"none",fontFamily:"inherit",marginBottom:12,boxSizing:"border-box"}}/>
                    </>
                  )}

                  <div style={{fontSize:11,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.07em",fontWeight:700,marginBottom:6}}>User ID / Login (optional)</div>
                  <input value={sfBankUserId} onChange={e=>setSfBankUserId(e.target.value)} placeholder="e.g. sudhakar123" style={{width:"100%",background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:12,padding:"12px 14px",fontSize:14,color:T.text,outline:"none",fontFamily:"inherit",marginBottom:12,boxSizing:"border-box"}}/>
                  <div style={{fontSize:11,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.07em",fontWeight:700,marginBottom:6}}>Registered Email (optional)</div>
                  <input value={sfRegEmail} onChange={e=>setSfRegEmail(e.target.value)} placeholder="e.g. you@gmail.com" type="email" style={{width:"100%",background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:12,padding:"12px 14px",fontSize:14,color:T.text,outline:"none",fontFamily:"inherit",marginBottom:12,boxSizing:"border-box"}}/>
                  <div style={{fontSize:11,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.07em",fontWeight:700,marginBottom:6}}>Online Banking Password (optional)</div>
                  <input value={sfBankPassword} onChange={e=>setSfBankPassword(e.target.value)} placeholder="e.g. ••••••••" type="password" style={{width:"100%",background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:12,padding:"12px 14px",fontSize:14,color:T.text,outline:"none",fontFamily:"inherit",marginBottom:12,boxSizing:"border-box",letterSpacing:2}}/>
                  <div style={{fontSize:11,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.07em",fontWeight:700,marginBottom:6}}>Notes (optional)</div>
                  <input value={sfNotes} onChange={e=>setSfNotes(e.target.value)} placeholder="Any additional info..." style={{width:"100%",background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:12,padding:"12px 14px",fontSize:14,color:T.text,outline:"none",fontFamily:"inherit",marginBottom:16,boxSizing:"border-box"}}/>

                  <div onClick={sfSaveItem} style={{background:"linear-gradient(135deg,#EF4444,#DC2626)",borderRadius:16,padding:"16px",textAlign:"center",cursor:"pointer",fontSize:15,fontWeight:800,color:"#fff"}}>
                    🔒 {sfEditId?"Update":"Save"} Securely
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── PERIOD CALENDAR SCREEN ────────────────────────────────────────*/}
        {mainTab === "periodcal" && (
          <div style={{flex:1,display:"flex",flexDirection:"column",padding:"0 0 100px",animation:"fadeIn 0.3s ease"}}>
            {/* Header */}
            <div style={{padding:"16px 20px 10px",display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
              <div onClick={()=>setMainTab(null)} style={{width:36,height:36,borderRadius:12,background:isDark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.05)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </div>
              <div style={{flex:1}}>
                <h1 style={{fontSize:24,fontWeight:900,color:T.text,margin:0,letterSpacing:"-0.02em"}}>Period Calendar</h1>
                <div style={{fontSize:10,color:T.textFaint,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase"}}>Cycle Tracker</div>
              </div>
              <div onClick={()=>{setPcShowLog(true);setPcLogDate(new Date().toISOString().slice(0,10));}} style={{padding:"8px 14px",borderRadius:12,background:"linear-gradient(135deg,#EC4899,#DB2777)",color:"#fff",fontSize:12,fontWeight:800,cursor:"pointer"}}>+ Log</div>
            </div>

            <div style={{flex:1,overflowY:"auto",padding:"0 16px 20px",WebkitOverflowScrolling:"touch"}}>

              {/* Member filter (if family members exist) */}
              {fwMembers.length > 1 && (
                <div style={{display:"flex",gap:6,marginBottom:14,overflowX:"auto",WebkitOverflowScrolling:"touch",paddingBottom:4}}>
                  <div onClick={()=>setPcSelectedMember("me")} style={{padding:"6px 14px",borderRadius:20,fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",background:pcSelectedMember==="me"?"linear-gradient(135deg,#EC4899,#DB2777)":(isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.05)"),color:pcSelectedMember==="me"?"#fff":T.text}}>Me</div>
                  {fwMembers.filter(m=>m.email!==fwUser?.email).map(m=>(
                    <div key={m.email} onClick={()=>setPcSelectedMember(m.email)} style={{padding:"6px 14px",borderRadius:20,fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",background:pcSelectedMember===m.email?"linear-gradient(135deg,#EC4899,#DB2777)":(isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.05)"),color:pcSelectedMember===m.email?"#fff":T.text}}>{m.name?.split(" ")[0]}</div>
                  ))}
                </div>
              )}

              {/* Cycle Info — Auto-calculated */}
              {(() => {
                const cd = pcCalcCycleData();
                return (
                <div style={{background:T.bgCard,borderRadius:16,border:`1px solid ${T.border}`,padding:"14px 16px",marginBottom:16}}>
                  <div style={{display:"flex",gap:16,alignItems:"center",marginBottom: cd.cycles.length > 0 ? 10 : 0}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:10,color:T.textFaint,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>Avg Cycle</div>
                      <div style={{display:"flex",alignItems:"baseline",gap:4}}>
                        <span style={{fontSize:24,fontWeight:900,color:"#EC4899"}}>{cd.avg}</span>
                        <span style={{fontSize:10,color:T.textFaint,fontWeight:600}}>days</span>
                        {cd.cycles.length === 0 && <span style={{fontSize:9,color:T.textFaint,fontStyle:"italic",marginLeft:4}}>(default — log 2+ periods)</span>}
                      </div>
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:10,color:T.textFaint,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>Period Length</div>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <div onClick={()=>{const v=Math.max(2,pcPeriodLength-1);setPcPeriodLength(v);localStorage.setItem("pulse_pc_period_len",v);saveSettingsToDrive({pcPeriodLength:v});}} style={{width:28,height:28,borderRadius:8,background:isDark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.05)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:16,fontWeight:700,color:T.text}}>−</div>
                        <span style={{fontSize:20,fontWeight:900,color:"#EC4899",minWidth:30,textAlign:"center"}}>{pcPeriodLength}</span>
                        <div onClick={()=>{const v=Math.min(10,pcPeriodLength+1);setPcPeriodLength(v);localStorage.setItem("pulse_pc_period_len",v);saveSettingsToDrive({pcPeriodLength:v});}} style={{width:28,height:28,borderRadius:8,background:isDark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.05)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:16,fontWeight:700,color:T.text}}>+</div>
                        <span style={{fontSize:10,color:T.textFaint}}>days</span>
                      </div>
                    </div>
                  </div>
                  {cd.cycles.length > 0 && (
                    <div>
                      <div style={{fontSize:9,color:T.textFaint,fontWeight:700,textTransform:"uppercase",marginBottom:6}}>Cycle History</div>
                      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                        {cd.cycles.slice(-6).map((c,i) => {
                          const fromD = new Date(c.from+"T00:00:00");
                          const toD = new Date(c.to+"T00:00:00");
                          const label = fromD.toLocaleDateString("en-US",{month:"short"}) + (fromD.getMonth()!==toD.getMonth()?"-"+toD.toLocaleDateString("en-US",{month:"short"}):"");
                          const diff = c.days - cd.avg;
                          const diffColor = Math.abs(diff) <= 2 ? "#22C55E" : Math.abs(diff) <= 5 ? "#F59E0B" : "#EF4444";
                          return (
                            <div key={i} style={{background:isDark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.03)",borderRadius:10,padding:"6px 10px",textAlign:"center",minWidth:48}}>
                              <div style={{fontSize:9,color:T.textFaint,fontWeight:600}}>{label}</div>
                              <div style={{fontSize:16,fontWeight:900,color:diffColor}}>{c.days}</div>
                              <div style={{fontSize:8,color:diffColor,fontWeight:700}}>{diff > 0 ? "+" : ""}{diff === 0 ? "avg" : diff + "d"}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                );
              })()}

              {/* Calendar Month View */}
              {(() => {
                const yr = pcSelectedMonth.getFullYear(), mo = pcSelectedMonth.getMonth();
                const firstDay = new Date(yr, mo, 1).getDay();
                const daysInMonth = new Date(yr, mo + 1, 0).getDate();
                const predictions = pcPregnancy?.active ? [] : pcGetPredictions();
                const fertileWindows = pcPregnancy?.active ? [] : pcGetFertileWindow();
                const memberPeriods = pcPeriods.filter(p => p.member === pcSelectedMember);

                const getLoggedEntry = (d) => memberPeriods.find(p => p.date === `${yr}-${String(mo+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`);
                const isLoggedDay = (d) => !!getLoggedEntry(d);
                const isMissedDay = (d) => { const e = getLoggedEntry(d); return e && e.type === "missed"; };
                const isDischargeOnly = (d) => { const e = getLoggedEntry(d); return e && e.type === "discharge_only"; };
                const isPredictedPeriod = (d) => {
                  const dt = new Date(yr, mo, d);
                  return predictions.some(p => dt >= p.start && dt <= p.end);
                };
                const isFertileDay = (d) => {
                  const dt = new Date(yr, mo, d);
                  return fertileWindows.some(f => dt >= f.start && dt <= f.end);
                };
                const isOvulation = (d) => {
                  const dt = new Date(yr, mo, d);
                  return fertileWindows.some(f => f.ovulation.toDateString() === dt.toDateString());
                };
                const today = new Date();
                const isToday = (d) => today.getFullYear()===yr && today.getMonth()===mo && today.getDate()===d;

                return (
                  <div style={{background:T.bgCard,borderRadius:16,border:`1px solid ${T.border}`,padding:"14px",marginBottom:16}}>
                    {/* Month navigation */}
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                      <div onClick={()=>setPcSelectedMonth(new Date(yr,mo-1,1))} style={{width:32,height:32,borderRadius:10,background:isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.04)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.text} strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                      </div>
                      <div style={{fontSize:16,fontWeight:800,color:T.text}}>{pcSelectedMonth.toLocaleString("en-US",{month:"long",year:"numeric"})}</div>
                      <div onClick={()=>setPcSelectedMonth(new Date(yr,mo+1,1))} style={{width:32,height:32,borderRadius:10,background:isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.04)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.text} strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                      </div>
                    </div>

                    {/* Day headers */}
                    <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:6}}>
                      {["S","M","T","W","T","F","S"].map((d,i)=>(<div key={i} style={{textAlign:"center",fontSize:10,fontWeight:700,color:T.textFaint,padding:"4px 0"}}>{d}</div>))}
                    </div>

                    {/* Day cells */}
                    <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
                      {Array.from({length:firstDay}).map((_,i)=><div key={"e"+i}/>)}
                      {Array.from({length:daysInMonth}).map((_,i)=>{
                        const d = i+1;
                        const logged = isLoggedDay(d);
                        const missed = isMissedDay(d);
                        const disOnly = isDischargeOnly(d);
                        const predicted = isPredictedPeriod(d);
                        const fertile = isFertileDay(d);
                        const ov = isOvulation(d);
                        const td = isToday(d);
                        let bg = "transparent", clr = T.text, border = "none", dot = null;
                        if (missed) { bg = "#F59E0B"; clr = "#fff"; dot = "⚠"; }
                        else if (disOnly) { bg = "#8B5CF6"; clr = "#fff"; dot = "💧"; }
                        else if (logged) { bg = "#EC4899"; clr = "#fff"; }
                        else if (predicted) { bg = isDark?"rgba(236,72,153,0.2)":"rgba(236,72,153,0.15)"; clr = "#EC4899"; }
                        else if (ov) { bg = isDark?"rgba(16,185,129,0.25)":"rgba(16,185,129,0.15)"; clr = "#10B981"; dot = "🥚"; }
                        else if (fertile) { bg = isDark?"rgba(16,185,129,0.12)":"rgba(16,185,129,0.08)"; clr = "#10B981"; }
                        if (td) border = `2px solid ${isDark?"#fff":"#000"}`;
                        return (
                          <div key={d} onClick={()=>{setPcLogDate(`${yr}-${String(mo+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`);setPcShowLog(true);}} style={{textAlign:"center",padding:"6px 0",borderRadius:10,fontSize:12,fontWeight:logged||td||missed||disOnly?800:500,background:bg,color:clr,border,cursor:"pointer",position:"relative",transition:"all 0.15s"}}>
                            {d}
                            {dot && <div style={{position:"absolute",bottom:0,left:"50%",transform:"translateX(-50%)",fontSize:6}}>{dot}</div>}
                          </div>
                        );
                      })}
                    </div>

                    {/* Legend */}
                    <div style={{display:"flex",gap:10,marginTop:12,flexWrap:"wrap"}}>
                      {[{color:"#EC4899",label:"Period"},{color:"#F59E0B",label:"Missed"},{color:"#8B5CF6",label:"Discharge"},{color:isDark?"rgba(236,72,153,0.3)":"rgba(236,72,153,0.2)",label:"Predicted"},{color:isDark?"rgba(16,185,129,0.2)":"rgba(16,185,129,0.15)",label:"Fertile"},{color:"#10B981",label:"Ovulation"}].map(l=>(
                        <div key={l.label} style={{display:"flex",alignItems:"center",gap:4}}>
                          <div style={{width:10,height:10,borderRadius:3,background:l.color}}/>
                          <span style={{fontSize:9,fontWeight:600,color:T.textFaint}}>{l.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Pregnancy Tracking Card */}
              {pcPregnancy && pcPregnancy.active && pcPregnancy.member === pcSelectedMember ? (() => {
                const pi = pcGetPregnancyInfo();
                if (!pi) return null;
                const trimesterLabel = ["1st Trimester","2nd Trimester","3rd Trimester"][pi.trimester-1];
                const trimesterColor = ["#F59E0B","#10B981","#8B5CF6"][pi.trimester-1];
                return (
                <div style={{background:"linear-gradient(135deg,#FDE68A,#FCD34D)",borderRadius:16,padding:"16px",marginBottom:16,border:"1px solid rgba(245,158,11,0.3)"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <span style={{fontSize:28}}>🤰</span>
                      <div>
                        <div style={{fontSize:16,fontWeight:900,color:"#92400E"}}>Pregnancy Tracker</div>
                        <div style={{fontSize:11,color:"#A16207"}}>Based on LMP: {new Date(pcPregnancy.lmpDate||pcPregnancy.startDate).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</div>
                      </div>
                    </div>
                    <div style={{padding:"4px 10px",borderRadius:20,background:trimesterColor,fontSize:9,fontWeight:800,color:"#fff"}}>{trimesterLabel}</div>
                  </div>

                  {/* Main stat: weeks + days */}
                  <div style={{background:"rgba(255,255,255,0.7)",borderRadius:14,padding:"14px 16px",marginBottom:10,textAlign:"center"}}>
                    <div style={{fontSize:32,fontWeight:900,color:"#92400E",lineHeight:1}}>{pi.weeks}<span style={{fontSize:16,fontWeight:700}}>w</span> {pi.days}<span style={{fontSize:16,fontWeight:700}}>d</span></div>
                    <div style={{fontSize:11,color:"#A16207",fontWeight:600,marginTop:4}}>{pi.months} month{pi.months!==1?"s":""} pregnant</div>
                  </div>

                  {/* Progress bar */}
                  <div style={{background:"rgba(255,255,255,0.4)",borderRadius:8,height:8,marginBottom:10,overflow:"hidden"}}>
                    <div style={{width:pi.progress+"%",height:"100%",borderRadius:8,background:"linear-gradient(90deg,#F59E0B,#EC4899)",transition:"width 0.3s"}}/>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:"#A16207",fontWeight:600,marginBottom:10}}>
                    <span>Week 1</span><span>{pi.progress}% complete</span><span>Week 40</span>
                  </div>

                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
                    <div style={{background:"rgba(255,255,255,0.55)",borderRadius:10,padding:"10px 8px",textAlign:"center"}}>
                      <div style={{fontSize:18,fontWeight:900,color:"#92400E"}}>{pi.daysLeft}</div>
                      <div style={{fontSize:9,fontWeight:700,color:"#A16207",textTransform:"uppercase"}}>Days Left</div>
                    </div>
                    <div style={{background:"rgba(255,255,255,0.55)",borderRadius:10,padding:"10px 8px",textAlign:"center"}}>
                      <div style={{fontSize:14,fontWeight:900,color:"#92400E"}}>{pi.dueDate.toLocaleDateString("en-US",{month:"short",day:"numeric"})}</div>
                      <div style={{fontSize:9,fontWeight:700,color:"#A16207",textTransform:"uppercase"}}>Due Date</div>
                    </div>
                    <div style={{background:"rgba(255,255,255,0.55)",borderRadius:10,padding:"10px 8px",textAlign:"center"}}>
                      <div style={{fontSize:14,fontWeight:900,color:"#92400E"}}>{pcPregnancy.testDate ? new Date(pcPregnancy.testDate+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"}) : "—"}</div>
                      <div style={{fontSize:9,fontWeight:700,color:"#A16207",textTransform:"uppercase"}}>Test Date</div>
                    </div>
                  </div>
                  <div onClick={pcEndPregnancy} style={{padding:"10px",borderRadius:10,background:"rgba(255,255,255,0.5)",textAlign:"center",cursor:"pointer",fontSize:12,fontWeight:700,color:"#92400E"}}>End Pregnancy Tracking</div>
                </div>
                );
              })() : null}

              {/* Missed Period Alerts */}
              {(() => {
                const missed = pcGetMissedPeriods();
                if (missed.length === 0) return null;
                return (
                  <div style={{marginBottom:16}}>
                    <div style={{fontSize:10,color:"#F59E0B",textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:700,marginBottom:8}}>⚠️ Missed Period Alerts</div>
                    {missed.map((m,i) => (
                      <div key={i} style={{background:isDark?"rgba(245,158,11,0.08)":"rgba(245,158,11,0.06)",borderRadius:14,border:"1px solid rgba(245,158,11,0.2)",padding:"12px 14px",marginBottom:6,display:"flex",alignItems:"center",gap:10}}>
                        <div style={{width:32,height:32,borderRadius:10,background:"rgba(245,158,11,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>⚠️</div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:12,fontWeight:700,color:T.text}}>Expected: {new Date(m.expected+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</div>
                          <div style={{fontSize:10,color:T.textFaint}}>{m.gap}-day gap detected between logs</div>
                        </div>
                        <div onClick={()=>{setPcShowLog(true);setPcLogDate(m.expected);setPcLogType("missed");}} style={{padding:"5px 10px",borderRadius:8,background:"rgba(245,158,11,0.15)",cursor:"pointer",fontSize:10,fontWeight:700,color:"#D97706"}}>Log It</div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Cycle Insights */}
              {(() => {
                const memberPeriods = pcPeriods.filter(p => p.member === pcSelectedMember && p.type !== "discharge_only");
                if (memberPeriods.length === 0) return (
                  <div style={{background:T.bgCard,borderRadius:16,border:`1px solid ${T.border}`,padding:"24px 16px",textAlign:"center",marginBottom:16}}>
                    <div style={{fontSize:36,marginBottom:8}}>🌸</div>
                    <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:4}}>No periods logged yet</div>
                    <div style={{fontSize:11,color:T.textFaint}}>Tap "+ Log" to record your first period day</div>
                  </div>
                );
                const last = new Date(memberPeriods[memberPeriods.length-1].date);
                const daysSince = Math.floor((new Date() - last) / 86400000);
                const nextPeriod = pcPregnancy?.active ? null : pcGetPredictions()[0];
                const daysUntilNext = nextPeriod ? Math.max(0, Math.floor((nextPeriod.start - new Date()) / 86400000)) : null;
                const isLate = daysSince > pcCycleLength + 5;
                return (
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
                    <div style={{background:T.bgCard,borderRadius:16,border:`1px solid ${isLate?"rgba(245,158,11,0.4)":T.border}`,padding:"16px",textAlign:"center"}}>
                      <div style={{fontSize:28,fontWeight:900,color:isLate?"#F59E0B":"#EC4899"}}>{daysSince}</div>
                      <div style={{fontSize:10,fontWeight:700,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.05em"}}>Days Since Last</div>
                      {isLate && <div style={{fontSize:9,color:"#F59E0B",fontWeight:700,marginTop:4}}>⚠️ Late</div>}
                    </div>
                    <div style={{background:T.bgCard,borderRadius:16,border:`1px solid ${T.border}`,padding:"16px",textAlign:"center"}}>
                      <div style={{fontSize:28,fontWeight:900,color:"#10B981"}}>{daysUntilNext !== null ? daysUntilNext : "—"}</div>
                      <div style={{fontSize:10,fontWeight:700,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.05em"}}>{pcPregnancy?.active ? "Pregnancy" : "Days Until Next"}</div>
                    </div>
                  </div>
                );
              })()}

              {/* Recent Logs */}
              {(() => {
                const memberPeriods = pcPeriods.filter(p => p.member === pcSelectedMember).slice(-10).reverse();
                if (memberPeriods.length === 0) return null;
                return (
                  <>
                    <div style={{fontSize:10,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:700,marginBottom:8}}>Recent Logs</div>
                    {memberPeriods.map(p => {
                      const typeIcon = p.type==="missed"?"⚠️":p.type==="discharge_only"?"💧":"🩸";
                      const typeBg = p.type==="missed"?"rgba(245,158,11,0.12)":p.type==="discharge_only"?"rgba(139,92,246,0.12)":"rgba(236,72,153,0.12)";
                      const dischargeInfo = p.discharge ? PC_DISCHARGE.find(d=>d.id===p.discharge) : null;
                      const flowInfo = p.flow ? PC_FLOW.find(f=>f.id===p.flow) : null;
                      return (
                      <div key={p.id} style={{background:T.bgCard,borderRadius:14,border:`1px solid ${T.border}`,padding:"12px 14px",marginBottom:8,display:"flex",alignItems:"center",gap:12}}>
                        <div style={{width:38,height:38,borderRadius:12,background:typeBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{typeIcon}</div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:"flex",alignItems:"center",gap:6}}>
                            <div style={{fontSize:13,fontWeight:700,color:T.text}}>{new Date(p.date+"T00:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}</div>
                            {p.type==="missed"&&<span style={{fontSize:8,fontWeight:800,color:"#D97706",background:"rgba(245,158,11,0.15)",padding:"2px 6px",borderRadius:6}}>MISSED</span>}
                            {flowInfo&&<span style={{fontSize:9,color:"#EC4899",fontWeight:600}}>{flowInfo.emoji} {flowInfo.label}</span>}
                          </div>
                          <div style={{fontSize:10,color:T.textFaint,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                            {p.mood && <span>{PC_MOODS.find(m=>m.label===p.mood)?.emoji} {p.mood} </span>}
                            {dischargeInfo && dischargeInfo.id!=="none" && <span>· {dischargeInfo.emoji} {dischargeInfo.label} </span>}
                            {p.symptoms && p.symptoms.length > 0 && <span>· {p.symptoms.join(", ")}</span>}
                          </div>
                        </div>
                        <div onClick={()=>pcDeleteEntry(p.id)} style={{width:28,height:28,borderRadius:8,background:"rgba(255,59,92,0.1)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0}}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF3B5C" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </div>
                      </div>
                      );
                    })}
                  </>
                );
              })()}
            </div>

            {/* Log Period Modal */}
            {pcShowLog && (
              <div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={()=>{setPcShowLog(false);setPcLogType("period");setPcTestResult("");setPcLmpDate("");}}>
                <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:420,background:T.bg,borderRadius:"24px 24px 0 0",padding:"20px 20px max(40px,calc(40px + env(safe-area-inset-bottom,0px)))",maxHeight:"85vh",overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
                  <div style={{width:40,height:4,borderRadius:2,background:T.border,margin:"0 auto 16px"}}/>
                  <h2 style={{fontSize:20,fontWeight:900,color:T.text,margin:"0 0 14px"}}>Log Entry</h2>

                  {/* Log Type Selector */}
                  <div style={{marginBottom:14}}>
                    <div style={{fontSize:10,fontWeight:700,color:T.textFaint,textTransform:"uppercase",marginBottom:6}}>Log Type</div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      {[{id:"period",label:"🩸 Period",color:"#EC4899"},{id:"missed",label:"⚠️ Missed",color:"#F59E0B"},{id:"discharge_only",label:"💧 Discharge",color:"#8B5CF6"},{id:"pregnancy_test",label:"🧪 Preg. Test",color:"#22C55E"}].map(t=>(
                        <div key={t.id} onClick={()=>{setPcLogType(t.id);if(t.id==="pregnancy_test"){setPcTestResult("");const mp=pcPeriods.filter(p=>p.member===pcSelectedMember&&p.type==="period").sort((a,b)=>new Date(a.date)-new Date(b.date));const beforeTest=mp.filter(p=>p.date<=pcLogDate);setPcLmpDate(beforeTest.length>0?beforeTest[beforeTest.length-1].date:(mp.length>0?mp[mp.length-1].date:""));}}} style={{flex:1,padding:"8px 4px",borderRadius:12,fontSize:10,fontWeight:700,cursor:"pointer",textAlign:"center",minWidth:72,background:pcLogType===t.id?t.color:(isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.05)"),color:pcLogType===t.id?"#fff":T.text,transition:"all 0.15s"}}>{t.label}</div>
                      ))}
                    </div>
                  </div>

                  {/* Date */}
                  <div style={{marginBottom:14}}>
                    <div style={{fontSize:10,fontWeight:700,color:T.textFaint,textTransform:"uppercase",marginBottom:6}}>Date</div>
                    <input type="date" value={pcLogDate} onChange={e=>setPcLogDate(e.target.value)} style={{width:"100%",padding:"10px 12px",borderRadius:12,border:`1px solid ${T.border}`,background:T.bgCard,color:T.text,fontSize:14,fontWeight:600,boxSizing:"border-box"}}/>
                  </div>

                  {/* Flow Level (only for period) */}
                  {pcLogType === "period" && (
                    <div style={{marginBottom:14}}>
                      <div style={{fontSize:10,fontWeight:700,color:T.textFaint,textTransform:"uppercase",marginBottom:6}}>Flow Level</div>
                      <div style={{display:"flex",gap:6}}>
                        {PC_FLOW.map(f=>(
                          <div key={f.id} onClick={()=>setPcFlow(pcFlow===f.id?"":f.id)} style={{flex:1,padding:"8px 6px",borderRadius:12,fontSize:11,fontWeight:700,cursor:"pointer",textAlign:"center",background:pcFlow===f.id?"linear-gradient(135deg,#EC4899,#DB2777)":(isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.05)"),color:pcFlow===f.id?"#fff":T.text,transition:"all 0.15s"}}>{f.emoji}<br/>{f.label}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Discharge */}
                  <div style={{marginBottom:14}}>
                    <div style={{fontSize:10,fontWeight:700,color:T.textFaint,textTransform:"uppercase",marginBottom:6}}>Discharge</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                      {PC_DISCHARGE.map(d=>(
                        <div key={d.id} onClick={()=>setPcDischarge(pcDischarge===d.id?"":d.id)} style={{padding:"6px 12px",borderRadius:20,fontSize:11,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:4,background:pcDischarge===d.id?"linear-gradient(135deg,#8B5CF6,#7C3AED)":(isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.05)"),color:pcDischarge===d.id?"#fff":T.text,transition:"all 0.15s"}}>{d.emoji} {d.label}</div>
                      ))}
                    </div>
                  </div>

                  {/* Symptoms */}
                  {pcLogType !== "discharge_only" && (
                    <div style={{marginBottom:14}}>
                      <div style={{fontSize:10,fontWeight:700,color:T.textFaint,textTransform:"uppercase",marginBottom:6}}>Symptoms</div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                        {PC_SYMPTOMS.map(s=>(
                          <div key={s} onClick={()=>setPcSymptoms(prev=>prev.includes(s)?prev.filter(x=>x!==s):[...prev,s])} style={{padding:"6px 12px",borderRadius:20,fontSize:11,fontWeight:700,cursor:"pointer",background:pcSymptoms.includes(s)?"linear-gradient(135deg,#EC4899,#DB2777)":(isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.05)"),color:pcSymptoms.includes(s)?"#fff":T.text,transition:"all 0.15s"}}>{s}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Mood */}
                  <div style={{marginBottom:14}}>
                    <div style={{fontSize:10,fontWeight:700,color:T.textFaint,textTransform:"uppercase",marginBottom:6}}>Mood</div>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                      {PC_MOODS.map(m=>(
                        <div key={m.label} onClick={()=>setPcMood(pcMood===m.label?"":m.label)} style={{padding:"6px 12px",borderRadius:20,fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:4,background:pcMood===m.label?"linear-gradient(135deg,#EC4899,#DB2777)":(isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.05)"),color:pcMood===m.label?"#fff":T.text}}>{m.emoji} {m.label}</div>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  <div style={{marginBottom:16}}>
                    <div style={{fontSize:10,fontWeight:700,color:T.textFaint,textTransform:"uppercase",marginBottom:6}}>Notes</div>
                    <textarea value={pcNotes} onChange={e=>setPcNotes(e.target.value)} placeholder="Optional notes..." rows={2} style={{width:"100%",padding:"10px 12px",borderRadius:12,border:`1px solid ${T.border}`,background:T.bgCard,color:T.text,fontSize:13,resize:"none",boxSizing:"border-box"}}/>
                  </div>

                  {/* Pregnancy Test — Positive / Negative selector */}
                  {pcLogType === "pregnancy_test" && (
                    <div style={{marginBottom:14}}>
                      <div style={{fontSize:10,fontWeight:700,color:T.textFaint,textTransform:"uppercase",marginBottom:8}}>Test Result</div>
                      <div style={{display:"flex",gap:10,marginBottom:12}}>
                        <div onClick={()=>setPcTestResult("positive")} style={{flex:1,padding:"14px 10px",borderRadius:14,cursor:"pointer",textAlign:"center",border:pcTestResult==="positive"?"2px solid #22C55E":`2px solid ${T.border}`,background:pcTestResult==="positive"?(isDark?"rgba(34,197,94,0.12)":"rgba(34,197,94,0.06)"):T.bgCard,transition:"all 0.15s"}}>
                          <div style={{fontSize:24,marginBottom:4}}>✅</div>
                          <div style={{fontSize:13,fontWeight:800,color:pcTestResult==="positive"?"#22C55E":T.text}}>Positive</div>
                        </div>
                        <div onClick={()=>setPcTestResult("negative")} style={{flex:1,padding:"14px 10px",borderRadius:14,cursor:"pointer",textAlign:"center",border:pcTestResult==="negative"?"2px solid #EF4444":`2px solid ${T.border}`,background:pcTestResult==="negative"?(isDark?"rgba(239,68,68,0.12)":"rgba(239,68,68,0.06)"):T.bgCard,transition:"all 0.15s"}}>
                          <div style={{fontSize:24,marginBottom:4}}>❌</div>
                          <div style={{fontSize:13,fontWeight:800,color:pcTestResult==="negative"?"#EF4444":T.text}}>Negative</div>
                        </div>
                      </div>

                      {/* Negative info */}
                      {pcTestResult === "negative" && (
                        <div style={{background:isDark?"rgba(59,130,246,0.1)":"rgba(59,130,246,0.06)",borderRadius:12,padding:"12px",border:"1px solid rgba(59,130,246,0.2)",textAlign:"center",marginBottom:8}}>
                          <div style={{fontSize:12,fontWeight:700,color:T.text,marginBottom:2}}>💙 Not pregnant</div>
                          <div style={{fontSize:10,color:T.textFaint}}>Regular period predictions will continue.</div>
                        </div>
                      )}

                      {/* Positive — LMP + calculation */}
                      {pcTestResult === "positive" && (
                        <div>
                          <div style={{marginBottom:10}}>
                            <div style={{fontSize:10,fontWeight:700,color:T.textFaint,textTransform:"uppercase",marginBottom:5}}>🩸 Last Period (LMP) Date</div>
                            <input type="date" value={pcLmpDate} onChange={e=>setPcLmpDate(e.target.value)} style={{width:"100%",padding:"10px 12px",borderRadius:12,border:`1px solid ${T.border}`,background:T.bgCard,color:T.text,fontSize:14,fontWeight:600,boxSizing:"border-box"}}/>
                            <div style={{fontSize:9,color:T.textFaint,marginTop:3}}>Auto-filled from your last period log</div>
                          </div>
                          {pcLmpDate && (() => {
                            const lmpMs = new Date(pcLmpDate+"T00:00:00").getTime();
                            const refDate = pcLogDate ? new Date(pcLogDate+"T00:00:00").getTime() : Date.now();
                            const totalDays = Math.floor((refDate - lmpMs) / 86400000);
                            const wk = Math.floor(totalDays / 7);
                            const dy = totalDays % 7;
                            const mo = Math.floor(totalDays / 30.44);
                            const due = new Date(lmpMs + 280 * 86400000);
                            const tri = wk < 13 ? "1st" : wk < 27 ? "2nd" : "3rd";
                            return (
                              <div style={{background:isDark?"rgba(34,197,94,0.1)":"rgba(34,197,94,0.06)",borderRadius:12,padding:"12px",border:"1px solid rgba(34,197,94,0.2)",marginBottom:8}}>
                                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,textAlign:"center"}}>
                                  <div>
                                    <div style={{fontSize:20,fontWeight:900,color:"#16A34A"}}>{wk}<span style={{fontSize:10}}>w</span> {dy}<span style={{fontSize:10}}>d</span></div>
                                    <div style={{fontSize:8,color:T.textFaint,fontWeight:600}}>AT TEST DATE</div>
                                  </div>
                                  <div>
                                    <div style={{fontSize:20,fontWeight:900,color:"#16A34A"}}>{mo}</div>
                                    <div style={{fontSize:8,color:T.textFaint,fontWeight:600}}>MONTHS</div>
                                  </div>
                                  <div>
                                    <div style={{fontSize:12,fontWeight:900,color:"#16A34A"}}>{due.toLocaleDateString("en-US",{month:"short",day:"numeric"})}</div>
                                    <div style={{fontSize:8,color:T.textFaint,fontWeight:600}}>DUE DATE</div>
                                  </div>
                                </div>
                                <div style={{textAlign:"center",marginTop:6,fontSize:10,fontWeight:700,color:"#16A34A"}}>{tri} Trimester · Due {due.toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}</div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  )}

                  <div onClick={pcLogPeriod} style={{width:"100%",padding:"14px",borderRadius:14,background:pcLogType==="pregnancy_test"?(pcTestResult==="positive"?"linear-gradient(135deg,#22C55E,#16A34A)":pcTestResult==="negative"?"linear-gradient(135deg,#3B82F6,#2563EB)":"linear-gradient(135deg,#9CA3AF,#6B7280)"):pcLogType==="missed"?"linear-gradient(135deg,#F59E0B,#D97706)":pcLogType==="discharge_only"?"linear-gradient(135deg,#8B5CF6,#7C3AED)":"linear-gradient(135deg,#EC4899,#DB2777)",color:"#fff",fontSize:15,fontWeight:800,textAlign:"center",cursor:"pointer",boxSizing:"border-box"}}>{pcLogType==="pregnancy_test"?(pcTestResult==="positive"?"Save & Start Tracking 🤰":pcTestResult==="negative"?"Save Negative Result":"Select a result above"):"Save Log"}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── FINANCE SCREEN ────────────────────────────────────────*/}
        {mainTab === "finance" && (() => {
          const fmt = (amt, cur) => (cur === "INR" ? "\u20B9" : "$") + Number(amt).toLocaleString("en-US", {minimumFractionDigits:2,maximumFractionDigits:2});
          const today = new Date().toISOString().split("T")[0];
          const inputStyle = {width:"100%",padding:"12px 14px",borderRadius:12,border:`1.5px solid ${T.border}`,background:T.bgCard,color:T.text,fontSize:14,outline:"none",boxSizing:"border-box"};
          const labelStyle = {fontSize:11,fontWeight:700,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6,display:"block"};
          const btnPrimary = {padding:"14px",borderRadius:14,background:"linear-gradient(135deg,#16A34A,#15803D)",color:"#fff",fontWeight:800,fontSize:15,border:"none",cursor:"pointer",width:"100%"};
          const pendingLent = moneyLent.filter(r=>r.status==="pending");
          const returnedLent = moneyLent.filter(r=>r.status==="returned");
          const totalPendingINR = pendingLent.filter(r=>r.currency==="INR").reduce((s,r)=>s+r.amount,0);
          const totalPendingUSD = pendingLent.filter(r=>r.currency==="USD").reduce((s,r)=>s+r.amount,0);
          const overdueReminders = payReminders.filter(r=>!r.paid && r.dueDate < today);
          return (
          <div style={{flex:1,display:"flex",flexDirection:"column",padding:"0 0 100px",animation:"fadeIn 0.3s ease"}}>
            {/* Header */}
            <div style={{padding:"20px 20px 14px",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <h1 style={{fontSize:28,fontWeight:900,color:T.text,fontFamily:"Georgia,serif",letterSpacing:"-0.03em",margin:0}}>Finance</h1>
                <div style={{fontSize:10,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:700,marginTop:4}}>Reminders & Lending</div>
              </div>
              <div onClick={()=>setMainTab(null)} style={{width:36,height:36,borderRadius:12,background:T.bgCard,border:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </div>
            </div>

            {/* Summary Cards */}
            <div style={{padding:"0 16px 16px",display:"flex",gap:10}}>
              <div style={{flex:1,background:overdueReminders.length>0?"linear-gradient(135deg,#EF4444,#DC2626)":"linear-gradient(135deg,#16A34A,#15803D)",borderRadius:16,padding:"14px",color:"#fff"}}>
                <div style={{fontSize:10,fontWeight:700,opacity:0.85,textTransform:"uppercase",letterSpacing:"0.06em"}}>Due Reminders</div>
                <div style={{fontSize:26,fontWeight:900,marginTop:4}}>{payReminders.filter(r=>!r.paid).length}</div>
                {overdueReminders.length>0 && <div style={{fontSize:10,opacity:0.9,marginTop:2}}>{overdueReminders.length} overdue</div>}
              </div>
              <div style={{flex:1,background:"linear-gradient(135deg,#F59E0B,#D97706)",borderRadius:16,padding:"14px",color:"#fff"}}>
                <div style={{fontSize:10,fontWeight:700,opacity:0.85,textTransform:"uppercase",letterSpacing:"0.06em"}}>Pending Lent</div>
                {totalPendingINR>0 && <div style={{fontSize:18,fontWeight:900,marginTop:4}}>{fmt(totalPendingINR,"INR")}</div>}
                {totalPendingUSD>0 && <div style={{fontSize:18,fontWeight:900,marginTop:totalPendingINR>0?2:4}}>{fmt(totalPendingUSD,"USD")}</div>}
                {totalPendingINR===0 && totalPendingUSD===0 && <div style={{fontSize:18,fontWeight:900,marginTop:4}}>$0.00</div>}
              </div>
            </div>

            {/* Sub-tabs */}
            <div style={{padding:"0 16px 14px",display:"flex",gap:8}}>
              {[{k:"reminders",label:"💳 Payment Reminders"},{k:"lent",label:"🤝 Money Lent"}].map(t=>(
                <div key={t.k} onClick={()=>setFinTab(t.k)} style={{flex:1,padding:"10px 0",borderRadius:12,textAlign:"center",fontWeight:700,fontSize:13,cursor:"pointer",background:finTab===t.k?"linear-gradient(135deg,#16A34A,#15803D)":(isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.05)"),color:finTab===t.k?"#fff":T.text,border:finTab===t.k?"none":`1px solid ${T.border}`}}>{t.label}</div>
              ))}
            </div>

            <div style={{flex:1,overflowY:"auto",padding:"0 16px"}}>

            {/* ── PAYMENT REMINDERS TAB ── */}
            {finTab === "reminders" && (
              <div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                  <div style={{fontSize:13,fontWeight:700,color:T.textFaint}}>{payReminders.length} reminder{payReminders.length!==1?"s":""}</div>
                  <div onClick={()=>{setPrEditId(null);setPrName("");setPrAmount("");setPrCurrency("USD");setPrDueDate("");setPrRecurrence("Monthly");setPrCategory("Bill");setPrNotes("");setPrShowAdd(true);}} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 14px",borderRadius:12,background:"linear-gradient(135deg,#16A34A,#15803D)",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add
                  </div>
                </div>

                {/* Add/Edit Reminder Form */}
                {prShowAdd && (
                  <div style={{background:T.bgCard,borderRadius:18,border:`1.5px solid ${T.border}`,padding:"18px",marginBottom:16}}>
                    <div style={{fontSize:16,fontWeight:800,color:T.text,marginBottom:16}}>{prEditId?"Edit Reminder":"Add Reminder"}</div>
                    <div style={{marginBottom:12}}><label style={labelStyle}>{prCategory === "Credit Card" ? "Card Name / Bank *" : "Bill / Subscription Name *"}</label><input value={prName} onChange={e=>setPrName(e.target.value)} placeholder={prCategory === "Credit Card" ? "e.g. Chase Sapphire, HDFC Regalia" : "e.g. Netflix, Electricity, Rent"} style={inputStyle}/></div>
                    <div style={{display:"flex",gap:10,marginBottom:12}}>
                      <div style={{flex:1}}><label style={labelStyle}>Amount *</label><input type="number" value={prAmount} onChange={e=>setPrAmount(e.target.value)} placeholder="0.00" style={inputStyle}/></div>
                      <div style={{width:100}}><label style={labelStyle}>Currency</label>
                        <div style={{display:"flex",gap:6}}>
                          {["USD","INR"].map(c=>(<div key={c} onClick={()=>setPrCurrency(c)} style={{flex:1,padding:"12px 0",borderRadius:10,textAlign:"center",fontWeight:700,fontSize:13,cursor:"pointer",background:prCurrency===c?(c==="INR"?"#FF6B00":"#16A34A"):(isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.05)"),color:prCurrency===c?"#fff":T.text,border:prCurrency===c?"none":`1px solid ${T.border}`}}>{c==="INR"?"₹ INR":"$ USD"}</div>))}
                        </div>
                      </div>
                    </div>
                    <div style={{marginBottom:12}}><label style={labelStyle}>Due Date *</label><input type="date" value={prDueDate} onChange={e=>setPrDueDate(e.target.value)} style={inputStyle}/></div>
                    <div style={{marginBottom:12}}><label style={labelStyle}>Recurrence</label>
                      <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                        {["One-time","Weekly","Monthly","Quarterly","Yearly"].map(r=>(<div key={r} onClick={()=>setPrRecurrence(r)} style={{padding:"8px 12px",borderRadius:10,fontWeight:700,fontSize:12,cursor:"pointer",background:prRecurrence===r?"linear-gradient(135deg,#6366F1,#4F46E5)":(isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.05)"),color:prRecurrence===r?"#fff":T.text,border:prRecurrence===r?"none":`1px solid ${T.border}`}}>{r}</div>))}
                      </div>
                    </div>
                    <div style={{marginBottom:12}}><label style={labelStyle}>Category</label>
                      <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                        {["Bill","Subscription","Rent","Insurance","Loan","Credit Card","Other"].map(c=>(<div key={c} onClick={()=>setPrCategory(c)} style={{padding:"8px 12px",borderRadius:10,fontWeight:700,fontSize:12,cursor:"pointer",background:prCategory===c?"linear-gradient(135deg,#F59E0B,#D97706)":(isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.05)"),color:prCategory===c?"#fff":T.text,border:prCategory===c?"none":`1px solid ${T.border}`}}>{c}</div>))}
                      </div>
                    </div>
                    {prCategory === "Credit Card" && (
                      <div style={{background:isDark?"rgba(99,102,241,0.08)":"rgba(99,102,241,0.05)",borderRadius:14,padding:"14px",marginBottom:12,border:`1px solid ${isDark?"rgba(99,102,241,0.2)":"rgba(99,102,241,0.15)"}`}}>
                        <div style={{fontSize:12,fontWeight:800,color:"#6366F1",marginBottom:12,textTransform:"uppercase",letterSpacing:"0.06em"}}>💳 Credit Card Details</div>
                        <div style={{display:"flex",gap:10,marginBottom:10}}>
                          <div style={{flex:1}}><label style={labelStyle}>Bank / Issuer</label><input value={prCardBank} onChange={e=>setPrCardBank(e.target.value)} placeholder="e.g. Chase, HDFC, Citi" style={inputStyle}/></div>
                          <div style={{width:110}}><label style={labelStyle}>Last 4 Digits</label><input value={prCardLast4} onChange={e=>setPrCardLast4(e.target.value.replace(/\D/g,"").slice(0,4))} placeholder="1234" maxLength={4} style={inputStyle}/></div>
                        </div>
                        <div style={{display:"flex",gap:10,marginBottom:10}}>
                          <div style={{flex:1}}><label style={labelStyle}>Total Due *</label><input type="number" value={prTotalDue} onChange={e=>setPrTotalDue(e.target.value)} placeholder="0.00" style={inputStyle}/></div>
                          <div style={{flex:1}}><label style={labelStyle}>Minimum Due</label><input type="number" value={prMinDue} onChange={e=>setPrMinDue(e.target.value)} placeholder="0.00" style={inputStyle}/></div>
                        </div>
                        <div style={{display:"flex",gap:10}}>
                          <div style={{flex:1}}><label style={labelStyle}>Statement Date</label><input type="date" value={prStatementDate} onChange={e=>setPrStatementDate(e.target.value)} style={inputStyle}/></div>
                          <div style={{flex:1}}><label style={labelStyle}>Credit Limit</label><input type="number" value={prCreditLimit} onChange={e=>setPrCreditLimit(e.target.value)} placeholder="0.00" style={inputStyle}/></div>
                        </div>
                      </div>
                    )}
                    <div style={{marginBottom:16}}><label style={labelStyle}>Notes (optional)</label><input value={prNotes} onChange={e=>setPrNotes(e.target.value)} placeholder="Any extra details..." style={inputStyle}/></div>
                    <div style={{display:"flex",gap:10}}>
                      <div onClick={()=>setPrShowAdd(false)} style={{flex:1,padding:"13px",borderRadius:12,background:isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.05)",color:T.text,fontWeight:700,fontSize:14,textAlign:"center",cursor:"pointer",border:`1px solid ${T.border}`}}>Cancel</div>
                      <div onClick={prSubmit} style={{flex:2,...btnPrimary,padding:"13px",borderRadius:12,textAlign:"center"}}>Save Reminder</div>
                    </div>
                  </div>
                )}

                {/* Reminder List */}
                {payReminders.length === 0 && !prShowAdd && (
                  <div style={{textAlign:"center",padding:"40px 20px",color:T.textFaint}}>
                    <div style={{fontSize:40,marginBottom:12}}>💳</div>
                    <div style={{fontSize:16,fontWeight:700,color:T.text,marginBottom:6}}>No reminders yet</div>
                    <div style={{fontSize:13}}>Add bills, subscriptions, or rent reminders</div>
                  </div>
                )}
                {payReminders.map(r => {
                  const isOverdue = !r.paid && r.dueDate < today;
                  const isCreditCard = r.category === "Credit Card";
                  const isDueToday = !r.paid && r.dueDate === today;
                  const daysUntil = Math.ceil((new Date(r.dueDate+"T00:00:00") - new Date(today+"T00:00:00")) / 86400000);
                  return (
                  <div key={r.id} style={{background:T.bgCard,borderRadius:16,border:`1.5px solid ${isOverdue?"#EF4444":isDueToday?"#F59E0B":T.border}`,padding:"14px",marginBottom:10,opacity:r.paid?0.55:1}}>
                    <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                      <div onClick={()=>prTogglePaid(r.id)} style={{width:24,height:24,borderRadius:8,border:`2px solid ${r.paid?"#16A34A":T.border}`,background:r.paid?"#16A34A":"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,marginTop:2}}>
                        {r.paid && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <div style={{fontSize:15,fontWeight:800,color:r.paid?T.textFaint:T.text,textDecoration:r.paid?"line-through":"none",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.name}</div>
                          <div style={{fontSize:16,fontWeight:900,color:r.currency==="INR"?"#FF6B00":"#16A34A",flexShrink:0,marginLeft:8}}>{fmt(r.amount,r.currency)}</div>
                        </div>
                        <div style={{display:"flex",gap:6,marginTop:6,flexWrap:"wrap",alignItems:"center"}}>
                          <span style={{fontSize:11,padding:"3px 8px",borderRadius:8,background:isOverdue?"rgba(239,68,68,0.12)":isDueToday?"rgba(245,158,11,0.12)":"rgba(99,102,241,0.10)",color:isOverdue?"#EF4444":isDueToday?"#F59E0B":"#6366F1",fontWeight:700}}>{isOverdue?"Overdue":isDueToday?"Due Today":daysUntil>0?`Due in ${daysUntil}d`:"Paid"}</span>
                          <span style={{fontSize:11,padding:"3px 8px",borderRadius:8,background:isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.05)",color:T.textFaint,fontWeight:600}}>{r.recurrence}</span>
                          <span style={{fontSize:11,padding:"3px 8px",borderRadius:8,background:isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.05)",color:T.textFaint,fontWeight:600}}>{r.category}</span>
                        </div>
                        <div style={{fontSize:11,color:T.textFaint,marginTop:4}}>Due: {new Date(r.dueDate+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</div>
                        {r.notes && <div style={{fontSize:11,color:T.textFaint,marginTop:2,fontStyle:"italic"}}>{r.notes}</div>}
                        {isCreditCard && (
                          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:6}}>
                            {r.cardBank && <span style={{fontSize:11,padding:"3px 8px",borderRadius:8,background:"rgba(99,102,241,0.10)",color:"#6366F1",fontWeight:700}}>{r.cardBank}{r.cardLast4?" ···"+r.cardLast4:""}</span>}
                            {r.totalDue>0 && <span style={{fontSize:11,padding:"3px 8px",borderRadius:8,background:"rgba(239,68,68,0.10)",color:"#EF4444",fontWeight:700}}>Total: {(r.currency==="INR"?"₹":"$")+Number(r.totalDue).toLocaleString()}</span>}
                            {r.minDue>0 && <span style={{fontSize:11,padding:"3px 8px",borderRadius:8,background:"rgba(245,158,11,0.10)",color:"#F59E0B",fontWeight:700}}>Min: {(r.currency==="INR"?"₹":"$")+Number(r.minDue).toLocaleString()}</span>}
                            {r.creditLimit>0 && <span style={{fontSize:11,padding:"3px 8px",borderRadius:8,background:isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.05)",color:T.textFaint,fontWeight:600}}>Limit: {(r.currency==="INR"?"₹":"$")+Number(r.creditLimit).toLocaleString()}</span>}
                          </div>
                        )}
                      </div>
                      <div style={{display:"flex",flexDirection:"column",gap:6,flexShrink:0}}>
                        <div onClick={()=>prEdit(r)} style={{width:30,height:30,borderRadius:8,background:isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.05)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.textFaint} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></div>
                        <div onClick={()=>prDelete(r.id)} style={{width:30,height:30,borderRadius:8,background:"rgba(239,68,68,0.10)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg></div>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}

            {/* ── MONEY LENT TAB ── */}
            {finTab === "lent" && (
              <div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                  <div style={{fontSize:13,fontWeight:700,color:T.textFaint}}>{moneyLent.length} record{moneyLent.length!==1?"s":""}</div>
                  <div onClick={()=>{setMlEditId(null);setMlFriend("");setMlAmount("");setMlCurrency("USD");setMlDate(today);setMlNote("");setMlStatus("pending");setMlShowAdd(true);}} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 14px",borderRadius:12,background:"linear-gradient(135deg,#F59E0B,#D97706)",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add
                  </div>
                </div>

                {/* Add/Edit Lent Form */}
                {mlShowAdd && (
                  <div style={{background:T.bgCard,borderRadius:18,border:`1.5px solid ${T.border}`,padding:"18px",marginBottom:16}}>
                    <div style={{fontSize:16,fontWeight:800,color:T.text,marginBottom:16}}>{mlEditId?"Edit Record":"Record Money Lent"}</div>
                    <div style={{marginBottom:12}}><label style={labelStyle}>Friend / Person Name *</label><input value={mlFriend} onChange={e=>setMlFriend(e.target.value)} placeholder="e.g. Ravi, Priya" style={inputStyle}/></div>
                    <div style={{display:"flex",gap:10,marginBottom:12}}>
                      <div style={{flex:1}}><label style={labelStyle}>Amount *</label><input type="number" value={mlAmount} onChange={e=>setMlAmount(e.target.value)} placeholder="0.00" style={inputStyle}/></div>
                      <div style={{width:100}}><label style={labelStyle}>Currency</label>
                        <div style={{display:"flex",gap:6}}>
                          {["USD","INR"].map(c=>(<div key={c} onClick={()=>setMlCurrency(c)} style={{flex:1,padding:"12px 0",borderRadius:10,textAlign:"center",fontWeight:700,fontSize:13,cursor:"pointer",background:mlCurrency===c?(c==="INR"?"#FF6B00":"#16A34A"):(isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.05)"),color:mlCurrency===c?"#fff":T.text,border:mlCurrency===c?"none":`1px solid ${T.border}`}}>{c==="INR"?"₹ INR":"$ USD"}</div>))}
                        </div>
                      </div>
                    </div>
                    <div style={{marginBottom:12}}><label style={labelStyle}>Date Lent *</label><input type="date" value={mlDate} onChange={e=>setMlDate(e.target.value)} style={inputStyle}/></div>
                    <div style={{marginBottom:12}}><label style={labelStyle}>Status</label>
                      <div style={{display:"flex",gap:8}}>
                        {[{v:"pending",l:"⏳ Pending"},{v:"returned",l:"✅ Returned"}].map(s=>(<div key={s.v} onClick={()=>setMlStatus(s.v)} style={{flex:1,padding:"10px 0",borderRadius:10,textAlign:"center",fontWeight:700,fontSize:13,cursor:"pointer",background:mlStatus===s.v?(s.v==="returned"?"#16A34A":"#F59E0B"):(isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.05)"),color:mlStatus===s.v?"#fff":T.text,border:mlStatus===s.v?"none":`1px solid ${T.border}`}}>{s.l}</div>))}
                      </div>
                    </div>
                    <div style={{marginBottom:16}}><label style={labelStyle}>Note (optional)</label><input value={mlNote} onChange={e=>setMlNote(e.target.value)} placeholder="What was it for?" style={inputStyle}/></div>
                    <div style={{display:"flex",gap:10}}>
                      <div onClick={()=>setMlShowAdd(false)} style={{flex:1,padding:"13px",borderRadius:12,background:isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.05)",color:T.text,fontWeight:700,fontSize:14,textAlign:"center",cursor:"pointer",border:`1px solid ${T.border}`}}>Cancel</div>
                      <div onClick={mlSubmit} style={{flex:2,padding:"13px",borderRadius:12,background:"linear-gradient(135deg,#F59E0B,#D97706)",color:"#fff",fontWeight:800,fontSize:14,textAlign:"center",cursor:"pointer"}}>Save Record</div>
                    </div>
                  </div>
                )}

                {/* Lent List */}
                {moneyLent.length === 0 && !mlShowAdd && (
                  <div style={{textAlign:"center",padding:"40px 20px",color:T.textFaint}}>
                    <div style={{fontSize:40,marginBottom:12}}>🤝</div>
                    <div style={{fontSize:16,fontWeight:700,color:T.text,marginBottom:6}}>No records yet</div>
                    <div style={{fontSize:13}}>Track money you've lent to friends</div>
                  </div>
                )}
                {pendingLent.length > 0 && <div style={{fontSize:11,fontWeight:700,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>⏳ Pending ({pendingLent.length})</div>}
                {pendingLent.map(r => (
                  <div key={r.id} style={{background:T.bgCard,borderRadius:16,border:`1.5px solid ${T.border}`,padding:"14px",marginBottom:10}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:40,height:40,borderRadius:12,background:"rgba(245,158,11,0.12)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:18}}>🤝</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <div style={{fontSize:15,fontWeight:800,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.friend}</div>
                          <div style={{fontSize:17,fontWeight:900,color:r.currency==="INR"?"#FF6B00":"#16A34A",flexShrink:0,marginLeft:8}}>{fmt(r.amount,r.currency)}</div>
                        </div>
                        <div style={{fontSize:11,color:T.textFaint,marginTop:3}}>{new Date(r.date+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}{r.note && " · "+r.note}</div>
                      </div>
                      <div style={{display:"flex",flexDirection:"column",gap:6,flexShrink:0}}>
                        <div onClick={()=>mlToggleStatus(r.id)} title="Mark returned" style={{width:30,height:30,borderRadius:8,background:"rgba(34,197,94,0.12)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
                        <div onClick={()=>mlEdit(r)} style={{width:30,height:30,borderRadius:8,background:isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.05)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.textFaint} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></div>
                        <div onClick={()=>mlDelete(r.id)} style={{width:30,height:30,borderRadius:8,background:"rgba(239,68,68,0.10)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg></div>
                      </div>
                    </div>
                  </div>
                ))}
                {returnedLent.length > 0 && <div style={{fontSize:11,fontWeight:700,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8,marginTop:16}}>✅ Returned ({returnedLent.length})</div>}
                {returnedLent.map(r => (
                  <div key={r.id} style={{background:T.bgCard,borderRadius:16,border:`1.5px solid ${T.border}`,padding:"14px",marginBottom:10,opacity:0.6}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:40,height:40,borderRadius:12,background:"rgba(34,197,94,0.12)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:18}}>✅</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <div style={{fontSize:15,fontWeight:800,color:T.text,textDecoration:"line-through",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.friend}</div>
                          <div style={{fontSize:17,fontWeight:900,color:T.textFaint,flexShrink:0,marginLeft:8}}>{fmt(r.amount,r.currency)}</div>
                        </div>
                        <div style={{fontSize:11,color:T.textFaint,marginTop:3}}>{new Date(r.date+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}{r.note && " · "+r.note}</div>
                      </div>
                      <div style={{display:"flex",flexDirection:"column",gap:6,flexShrink:0}}>
                        <div onClick={()=>mlToggleStatus(r.id)} title="Mark pending" style={{width:30,height:30,borderRadius:8,background:"rgba(245,158,11,0.12)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg></div>
                        <div onClick={()=>mlDelete(r.id)} style={{width:30,height:30,borderRadius:8,background:"rgba(239,68,68,0.10)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            </div>
          </div>
          );
        })()}

        {/* ─── SETTINGS SCREEN ────────────────────────────────────────*/}
        {mainTab === "settings" && (
          <div style={{flex:1,display:"flex",flexDirection:"column",padding:"0 0 100px",animation:"fadeIn 0.3s ease"}}>
            {/* Header */}
            <div style={{padding:"20px 20px 14px",flexShrink:0}}>
              <h1 style={{fontSize:28,fontWeight:900,color:T.text,fontFamily:"Georgia,serif",letterSpacing:"-0.03em",margin:0}}>Settings</h1>
              <div style={{fontSize:10,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:700,marginTop:4}}>Personal Preferences</div>
            </div>

            <div style={{flex:1,overflowY:"auto",padding:"0 16px 20px",WebkitOverflowScrolling:"touch"}}>
              {/* Profile Card */}
              {fwUser && (() => {
                const me = (fwMembers||[]).find(m=>m.email===fwUser?.email);

                function saveProfile(field, value) {
                  let members = fwMembers || [];
                  const exists = members.some(m => m.email === fwUser.email);
                  let updated;
                  if (exists) {
                    updated = members.map(m => m.email === fwUser.email ? {...m, [field]: value} : m);
                  } else {
                    updated = [...members, { name: fwUser.name, email: fwUser.email, gender: "", role: fwRole || "head", joinedAt: Date.now(), photo: fwUser.photo, [field]: value }];
                  }
                  setFwMembers(updated);
                  // Always persist to localStorage cache so data survives app restart
                  localStorage.setItem("pulse_fw_members_cache", JSON.stringify(updated));
                  if (fwWorkspace?.fileIds?.members && fwToken) {
                    fwWriteFile(fwWorkspace.fileIds.members, updated, fwToken).catch(()=>{});
                  }
                  if (field === "name") {
                    const u = {...fwUser, name: value};
                    setFwUser(u);
                    localStorage.setItem("pulse_fw_user", JSON.stringify(u));
                  }
                }

                return (
                <>
                {/* Profile Card */}
                <div style={{background:isDark?"rgba(34,197,94,0.08)":"#fff",border:`1px solid ${isDark?"rgba(34,197,94,0.2)":"rgba(34,197,94,0.2)"}`,borderRadius:18,padding:"16px",marginBottom:4,display:"flex",alignItems:"center",gap:14,boxShadow:isDark?"none":"0 1px 4px rgba(0,0,0,0.04)"}}>
                  {fwUser.photo ? <img src={fwUser.photo} style={{width:48,height:48,borderRadius:24,border:"2px solid rgba(34,197,94,0.3)"}} alt=""/> : <div style={{width:48,height:48,borderRadius:24,background:"linear-gradient(135deg,#22C55E,#10B981)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:800,color:"#fff"}}>{fwUser.name?.[0]}</div>}
                  <div style={{flex:1}}>
                    <div style={{fontSize:16,fontWeight:800,color:T.text}}>{fwUser.name}</div>
                    <div style={{fontSize:11,color:T.textFaint,marginTop:2}}>{fwRole === "head" ? "FAMILY HEAD" : "MEMBER"} · {fwMembers.length} member{fwMembers.length !== 1 ? "s" : ""}</div>
                  </div>
                  <div onClick={()=>{setEditingProfile(!editingProfile);setEditName(fwUser.name||"");}} style={{padding:"6px 10px",borderRadius:10,cursor:"pointer",fontSize:12,background:isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.04)",color:T.textMuted}}>✏️</div>
                </div>

                {/* Edit Profile Panel */}
                {editingProfile && (
                  <div style={{background:T.bgCard,borderRadius:16,border:`1px solid ${T.border}`,padding:"14px 16px",marginBottom:4,animation:"fadeIn 0.2s ease"}}>
                    <div style={{fontSize:10,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:700,marginBottom:10}}>Edit Profile</div>

                    <div style={{marginBottom:10}}>
                      <div style={{fontSize:10,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.05em",fontWeight:600,marginBottom:4}}>Display Name</div>
                      <div style={{display:"flex",gap:6}}>
                        <input value={editName} onChange={e=>setEditName(e.target.value)} style={{flex:1,padding:"10px 12px",borderRadius:10,border:`1px solid ${T.border}`,background:T.bgInput,color:T.text,fontSize:13,fontWeight:600,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
                        <div onClick={()=>{if(editName.trim()){saveProfile("name",editName.trim());}}} style={{padding:"10px 14px",borderRadius:10,cursor:"pointer",fontSize:11,fontWeight:700,background:"rgba(34,197,94,0.15)",color:"#22C55E"}}>Save</div>
                      </div>
                    </div>

                    <div style={{marginBottom:10}}>
                      <div style={{fontSize:10,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.05em",fontWeight:600,marginBottom:4}}>Email</div>
                      <div style={{padding:"10px 12px",borderRadius:10,background:isDark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.02)",fontSize:13,color:T.textFaint}}>{fwUser.email}</div>
                    </div>

                    <div>
                      <div style={{fontSize:10,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.05em",fontWeight:600,marginBottom:6}}>Gender</div>
                      {me?.gender ? (
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <div style={{padding:"10px 16px",borderRadius:12,fontSize:13,fontWeight:700,background:"rgba(34,197,94,0.15)",border:"1px solid #22C55E",color:"#22C55E"}}>{me.gender==="male"?"👨 Male":"👩 Female"}</div>
                          <div onClick={()=>saveProfile("gender","")} style={{fontSize:11,color:T.textFaint,cursor:"pointer",textDecoration:"underline"}}>Change</div>
                        </div>
                      ) : (
                        <div style={{display:"flex",gap:6}}>
                          {[{id:"male",label:"Male",emoji:"👨"},{id:"female",label:"Female",emoji:"👩"}].map(g=>(
                            <div key={g.id} onClick={()=>saveProfile("gender",g.id)} style={{flex:1,padding:"10px 8px",borderRadius:12,fontSize:12,fontWeight:700,cursor:"pointer",textAlign:"center",background:isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.04)",border:`1px solid ${T.border}`,color:T.textMuted,transition:"all 0.15s"}}>{g.emoji} {g.label}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div style={{marginBottom:16}}/>
                </>
                );
              })()}

              {/* Family Workspace */}
              <div style={{fontSize:10,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:700,marginBottom:10,marginTop:8,display:"flex",alignItems:"center",gap:6}}>
                <span>👨‍👩‍👧‍👦</span> Family Workspace
              </div>

              <div style={{background:T.bgCard,borderRadius:16,border:`1px solid ${T.border}`,overflow:"hidden",marginBottom:20}}>
                {/* Manage Members */}
                <div onClick={()=>setMainTab("family")} style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",cursor:"pointer",borderBottom:`1px solid ${T.border}`}}>
                  <div style={{width:34,height:34,borderRadius:10,background:"rgba(34,197,94,0.12)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:700,color:T.text}}>Manage Members</div>
                    <div style={{fontSize:11,color:T.textFaint}}>{fwMembers.length} member{fwMembers.length !== 1 ? "s" : ""} in workspace</div>
                  </div>
                  <span style={{fontSize:14,color:T.textFaint}}>›</span>
                </div>

                {/* Google Drive Sync */}
                {fwWorkspace && (
                  <div style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",borderBottom:`1px solid ${T.border}`}}>
                    <div style={{width:34,height:34,borderRadius:10,background:"rgba(66,133,244,0.12)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4285F4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:14,fontWeight:700,color:T.text}}>Google Drive</div>
                      <div style={{fontSize:11,color:"#22C55E"}}>Synced ✓</div>
                    </div>
                  </div>
                )}

                {/* User email */}
                {fwUser && (
                  <div style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px"}}>
                    <div style={{width:34,height:34,borderRadius:10,background:"rgba(99,102,241,0.12)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:14,fontWeight:700,color:T.text}}>Account</div>
                      <div style={{fontSize:11,color:T.textFaint}}>{fwUser.email}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* App Settings */}
              <div style={{fontSize:10,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:700,marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
                <span>⚙️</span> App Settings
              </div>

              <div style={{background:T.bgCard,borderRadius:16,border:`1px solid ${T.border}`,overflow:"hidden",marginBottom:20}}>
                {/* Appearance */}
                <div style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",borderBottom:`1px solid ${T.border}`}}>
                  <div style={{width:34,height:34,borderRadius:10,background:"rgba(251,191,36,0.12)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <span style={{fontSize:16}}>{isDark ? "🌙" : "☀️"}</span>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:700,color:T.text}}>Appearance</div>
                  </div>
                  <div style={{fontSize:12,fontWeight:700,color:T.textMuted}}>{isDark ? "DARK MODE" : "LIGHT MODE"}</div>
                </div>
              </div>

              {/* Second Country Clock */}
              <div style={{fontSize:10,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:700,marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
                <span>🌍</span> Second Country Clock
              </div>

              <div style={{background:T.bgCard,borderRadius:16,border:`1px solid ${T.border}`,overflow:"hidden",marginBottom:20}}>
                <div style={{display:"flex",alignItems:"center",gap:10,padding:"14px 16px",borderBottom:`1px solid ${T.border}`}}>
                  <div style={{width:34,height:34,borderRadius:10,background:"rgba(59,130,246,0.12)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:700,color:T.text}}>Select Country</div>
                    <div style={{fontSize:11,color:T.textFaint}}>Currently: {secondCountry.flag} {secondCountry.label} ({secondCountry.city})</div>
                  </div>
                </div>
                {SECOND_COUNTRY_OPTIONS.map((c, i) => (
                  <div key={c.key} onClick={() => { setSecondCountry(c); localStorage.setItem("pulse_second_country", c.key); saveSettingsToDrive({ secondCountry: c.key }); }}
                    style={{display:"flex",alignItems:"center",padding:"12px 16px",cursor:"pointer",
                      borderBottom:i<SECOND_COUNTRY_OPTIONS.length-1?`1px solid ${T.border}`:"none",
                      background:secondCountry.key===c.key?(isDark?"rgba(59,130,246,0.13)":"rgba(59,130,246,0.06)"):"transparent",
                      borderLeft:secondCountry.key===c.key?"3px solid #3B82F6":"3px solid transparent",
                      transition:"background 0.2s"}}>
                    <span style={{fontSize:18,marginRight:10}}>{c.flag}</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:secondCountry.key===c.key?700:500,color:secondCountry.key===c.key?"#3B82F6":T.text}}>{c.label}</div>
                      <div style={{fontSize:10,color:T.textFaint}}>{c.city} · {c.tz}</div>
                    </div>
                    {secondCountry.key===c.key && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                  </div>
                ))}
              </div>

              {/* Appointment Reminders */}
              <div style={{fontSize:10,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:700,marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
                <span>🔔</span> Appointment Reminders
              </div>

              <div style={{background:T.bgCard,borderRadius:16,border:`1px solid ${T.border}`,overflow:"hidden",marginBottom:20,padding:"16px"}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
                  <div style={{width:34,height:34,borderRadius:10,background:"rgba(99,102,241,0.12)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  </div>
                  <div style={{fontSize:16,fontWeight:800,color:T.text}}>Reminder Window</div>
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                  {["1 Hour","3 Hours","6 Hours","12 Hours","1 Day","2 Days"].map(opt => (
                    <div key={opt} onClick={() => { setReminderWindow(opt); localStorage.setItem("pulse_reminder_window", opt); saveSettingsToDrive({ reminderWindow: opt }); }} style={{flex:"1 1 calc(33.33% - 6px)",minWidth:80,textAlign:"center",padding:"10px 0",borderRadius:12,cursor:"pointer",fontWeight:700,fontSize:13,transition:"all 0.2s",background:reminderWindow===opt?"linear-gradient(135deg,#3B82F6,#2563EB)":(isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.05)"),color:reminderWindow===opt?"#fff":T.text,border:reminderWindow===opt?"none":`1px solid ${T.border}`,boxShadow:reminderWindow===opt?"0 2px 8px rgba(59,130,246,0.3)":"none"}}>
                      {opt}
                    </div>
                  ))}
                </div>
              </div>

              {/* PingMe Encryption */}
              <div style={{fontSize:10,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:700,marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
                <span>🔒</span> PingMe Encryption
              </div>

              <div style={{background:T.bgCard,borderRadius:16,border:`1px solid ${T.border}`,overflow:"hidden",marginBottom:20}}>
                <div style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",borderBottom:pingEncryptEnabled?`1px solid ${T.border}`:"none"}}>
                  <div style={{width:34,height:34,borderRadius:10,background:"rgba(20,184,166,0.12)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#14B8A6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:700,color:T.text}}>Password Protection</div>
                    <div style={{fontSize:11,color:T.textFaint}}>Encrypt chats with a custom password</div>
                  </div>
                  <div onClick={()=>{
                    const next = !pingEncryptEnabled;
                    setPingEncryptEnabled(next);
                    localStorage.setItem("pulse_ping_encrypt", next ? "true" : "false");
                    saveSettingsToDrive({ pingEncrypt: next });
                    if (!next) {
                      sessionStorage.removeItem("pulse_ping_pass");
                      setPingPassword("PulseDefaultKey2026");
                    } else if (!sessionStorage.getItem("pulse_ping_pass")) {
                      setPingScreen("setPassword");
                    }
                  }} style={{width:44,height:26,borderRadius:13,background:pingEncryptEnabled?"#14B8A6":(isDark?"rgba(255,255,255,0.12)":"rgba(0,0,0,0.1)"),padding:2,cursor:"pointer",transition:"background 0.2s",display:"flex",alignItems:pingEncryptEnabled?"center":"center"}}>
                    <div style={{width:22,height:22,borderRadius:11,background:"#fff",boxShadow:"0 1px 3px rgba(0,0,0,0.2)",transition:"transform 0.2s",transform:pingEncryptEnabled?"translateX(18px)":"translateX(0)"}}/>
                  </div>
                </div>
                {pingEncryptEnabled && (
                  <div style={{padding:"12px 16px"}}>
                    <div style={{fontSize:11,color:"#14B8A6",fontWeight:600}}>
                      {sessionStorage.getItem("pulse_ping_pass") && sessionStorage.getItem("pulse_ping_pass") !== "PulseDefaultKey2026"
                        ? "✓ Password is set for this session"
                        : "⚠️ No password set — tap PingMe to create one"}
                    </div>
                  </div>
                )}
              </div>

              {/* PingMe Notifications */}
              <div style={{fontSize:10,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:700,marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
                <span>💬</span> PingMe Notifications
              </div>
              <div style={{background:T.bgCard,borderRadius:16,border:`1px solid ${T.border}`,overflow:"hidden",marginBottom:20}}>
                <div style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px"}}>
                  <div style={{width:34,height:34,borderRadius:10,background:"rgba(20,184,166,0.12)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#14B8A6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:700,color:T.text}}>Message Notifications</div>
                    <div style={{fontSize:12,color:T.textMuted,marginTop:2}}>
                      {typeof Notification === 'undefined' ? 'Not supported on this device' :
                       Notification.permission === 'granted' ? '✅ Enabled — you\'ll get notified of new messages' :
                       Notification.permission === 'denied' ? '❌ Blocked — enable in browser settings' :
                       'Tap to enable message notifications'}
                    </div>
                  </div>
                  {typeof Notification !== 'undefined' && Notification.permission !== 'granted' && Notification.permission !== 'denied' && (
                    <button onClick={()=>Notification.requestPermission()} style={{background:"#14B8A6",color:"#fff",border:"none",borderRadius:8,padding:"6px 12px",fontSize:12,fontWeight:700,cursor:"pointer"}}>Enable</button>
                  )}
                  {typeof Notification !== 'undefined' && Notification.permission === 'denied' && (
                    <span style={{fontSize:11,color:"#FF3B5C",fontWeight:600}}>Blocked</span>
                  )}
                </div>
              </div>
              {/* Notification Sound */}
              <div style={{fontSize:10,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:700,marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
                <span>🔔</span> Notification Sound
              </div>

              <div style={{background:T.bgCard,borderRadius:16,border:`1px solid ${T.border}`,overflow:"hidden",marginBottom:20}}>
                <div style={{display:"flex",alignItems:"center",gap:10,padding:"14px 16px",borderBottom:`1px solid ${T.border}`}}>
                  <div style={{width:34,height:34,borderRadius:10,background:"rgba(168,85,247,0.12)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A855F7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
                  </div>
                  <div style={{fontSize:16,fontWeight:800,color:T.text}}>Notification Sound</div>
                </div>
                {["Default Beep","Crystal Chime","Heartbeat Pulse","Silent"].map((snd, i) => (
                  <div key={snd} onClick={() => { setNotifSound(snd); localStorage.setItem("pulse_notif_sound", snd); saveSettingsToDrive({ notifSound: snd }); }} style={{display:"flex",alignItems:"center",padding:"13px 16px",cursor:"pointer",borderBottom:i<3?`1px solid ${T.border}`:"none",background:notifSound===snd?(isDark?"rgba(168,85,247,0.13)":"rgba(168,85,247,0.08)"):"transparent",transition:"background 0.2s",borderLeft:notifSound===snd?"3px solid #A855F7":"3px solid transparent"}}>
                    <div style={{flex:1,fontSize:14,fontWeight:notifSound===snd?700:500,color:notifSound===snd?"#A855F7":T.text}}>{snd}</div>
                    {notifSound===snd && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A855F7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                  </div>
                ))}
              </div>

              {/* Sign Out */}
              <div style={{background:T.bgCard,borderRadius:16,border:`1px solid ${T.border}`,overflow:"hidden",marginBottom:20}}>
                <div onClick={fwSignOut} style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",cursor:"pointer"}}>
                  <div style={{width:34,height:34,borderRadius:10,background:"rgba(255,59,92,0.12)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF3B5C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  </div>
                  <div style={{fontSize:14,fontWeight:700,color:"#FF3B5C"}}>Sign Out</div>
                  <span style={{fontSize:14,color:T.textFaint,marginLeft:"auto"}}>›</span>
                </div>
              </div>

              {/* Version */}
              <div style={{textAlign:"center",padding:"20px 0",fontSize:11,color:T.textFaint,letterSpacing:"0.06em"}}>PULSE FAMILY HUB V1.2.0</div>
            </div>

            {/* Bottom Nav */}
            <div style={{position:"fixed",bottom:0,left:0,right:0,background:isDark?"rgba(8,10,14,0.95)":"rgba(255,255,255,0.97)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",borderTop:`1px solid ${isDark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.08)"}`,display:"flex",alignItems:"center",justifyContent:"space-around",padding:"8px 0 max(env(safe-area-inset-bottom,8px),8px)",zIndex:100}}>
              {[
                {key:null,label:"Home",icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={isDark?"rgba(255,255,255,0.4)":"rgba(0,0,0,0.35)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>},
                {key:"movies",label:"Movies",icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={isDark?"rgba(255,255,255,0.4)":"rgba(0,0,0,0.35)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/><line x1="17" y1="17" x2="22" y2="17"/></svg>},
                {key:"grocery",label:"Shop",icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={isDark?"rgba(255,255,255,0.4)":"rgba(0,0,0,0.35)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>},
                {key:"ping",label:"Chat",icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={isDark?"rgba(255,255,255,0.4)":"rgba(0,0,0,0.35)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>},
                {key:"settings",label:"Settings",icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={isDark?"#fff":"#000"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>}
              ].map(nav=>(
                <div key={nav.key||"home"} onClick={()=>setMainTab(nav.key)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,cursor:"pointer",padding:"2px 12px",WebkitTapHighlightColor:"transparent"}}>
                  {nav.icon}
                  <span style={{fontSize:9,fontWeight:nav.key==="settings"?700:500,color:T.text}}>{nav.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── FAMILY WORKSPACE MANAGEMENT ────────────────────────────────────────*/}
        {mainTab === "family" && (
          <div style={{flex:1,display:"flex",flexDirection:"column",padding:"0 0 100px",animation:"fadeIn 0.4s ease"}}>
            {/* Header */}
            <div style={{padding:"14px 20px 10px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
              <div onClick={()=>setMainTab(null)} style={{cursor:"pointer",color:T.textFaint,padding:"6px 10px",background:isDark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.05)",borderRadius:20,display:"flex",alignItems:"center"}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg></div>
              <div style={{flex:1}}>
                <div style={{fontSize:16,fontWeight:900,color:T.text}}>Family Workspace</div>
                {fwUser && <div style={{fontSize:10,color:T.textFaint}}>{fwRole === "head" ? "You are the Family Head" : "You are a Family Member"} · {fwMembers.length} member{fwMembers.length !== 1 ? "s" : ""}</div>}
              </div>
              {fwUser && fwRole === "head" && (
                <div onClick={()=>setFwShowInvite(true)} style={{background:"linear-gradient(135deg,#22C55E,#10B981)",borderRadius:12,padding:"8px 14px",fontSize:12,fontWeight:800,color:"#fff",cursor:"pointer"}}>+ Invite</div>
              )}
            </div>

            {/* Not signed in — show sign-in prompt */}
            {!fwUser && (
              <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 24px",textAlign:"center"}}>
                <div style={{width:80,height:80,borderRadius:40,background:isDark?"rgba(34,197,94,0.1)":"rgba(34,197,94,0.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,marginBottom:20}}>👨‍👩‍👧‍👦</div>
                <h3 style={{fontSize:18,fontWeight:800,color:T.text,marginBottom:8}}>Family Workspace</h3>
                <p style={{fontSize:13,color:T.textMuted,lineHeight:1.6,marginBottom:24,maxWidth:280}}>
                  Sign in with Google to create a shared workspace. Sync your Grocery list, To-Do tasks, and Doctor appointments across all family members.
                </p>
                <div onClick={fwGoogleLogin} style={{background:"linear-gradient(135deg,#22C55E,#10B981)",borderRadius:14,padding:"14px 32px",cursor:"pointer",display:"flex",alignItems:"center",gap:10,boxShadow:"0 4px 12px rgba(34,197,94,0.3)"}}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  <span style={{fontSize:14,fontWeight:800,color:"#fff"}}>Sign in with Google</span>
                </div>
                <p style={{fontSize:10,color:T.textFaint,marginTop:16}}>Uses Google Drive to store shared data securely</p>
              </div>
            )}

            {/* Signed in — show workspace content */}
            {fwUser && <div style={{flex:1,overflowY:"auto",padding:"16px 20px"}}>
              {/* Workspace info card */}
              {fwWorkspace && (
                <div style={{background:isDark?"rgba(34,197,94,0.08)":"rgba(34,197,94,0.06)",border:`1px solid rgba(34,197,94,0.2)`,borderRadius:14,padding:"14px",marginBottom:16}}>
                  <div style={{fontSize:11,fontWeight:800,color:"#22C55E",marginBottom:8}}>📍 Google Drive Workspace</div>
                  <div style={{display:"flex",flexDirection:"column",gap:5}}>
                    {[{label:"Grocery",key:"grocery"},{label:"To-Do",key:"todos"},{label:"Appointments",key:"appointments"},{label:"Members",key:"members"}].map(f=>(
                      <div key={f.key} style={{display:"flex",alignItems:"center",gap:8}}>
                        <div style={{width:7,height:7,borderRadius:"50%",background:fwWorkspace.fileIds?.[f.key]?"#22C55E":"#FF3B5C",flexShrink:0}}/>
                        <div style={{fontSize:11,color:T.text,fontWeight:600}}>{f.label}.json</div>
                        <div style={{fontSize:11,color:T.textFaint,marginLeft:"auto"}}>{fwWorkspace.fileIds?.[f.key]?"Synced":"Not found"}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Members list */}
              <div style={{fontSize:12,fontWeight:800,color:T.textMuted,marginBottom:10,letterSpacing:"0.06em",textTransform:"uppercase"}}>Family Members</div>
              {fwMembers.length === 0 && (
                <div style={{textAlign:"center",padding:"30px 20px",color:T.textFaint,fontSize:13}}>
                  No members yet. {fwRole === "head" ? "Invite family members to get started." : "Ask the Family Head to invite you."}
                </div>
              )}
              {fwMembers.map((m,i) => (
                <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:T.bgCard,borderRadius:14,marginBottom:8,border:`1px solid ${T.border}`}}>
                  <div style={{width:38,height:38,borderRadius:19,background:`hsl(${(i*67)%360},60%,55%)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:800,color:"#fff",flexShrink:0}}>
                    {(m.name||m.email||"?")[0].toUpperCase()}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:700,color:T.text}}>{m.name || m.email.split("@")[0]}</div>
                    <div style={{fontSize:10,color:T.textFaint}}>{m.email}</div>
                  </div>
                  <div style={{fontSize:9,fontWeight:700,color:m.role==="head"?"#22C55E":"#A855F7",background:m.role==="head"?"rgba(34,197,94,0.12)":"rgba(168,85,247,0.12)",padding:"3px 8px",borderRadius:10}}>
                    {m.role === "head" ? "Head" : "Member"}
                  </div>
                  {fwRole === "head" && m.role !== "head" && (
                    <div onClick={()=>fwRemoveMember(m.email)} style={{fontSize:13,color:T.textFaint,cursor:"pointer",padding:"4px 6px"}}>❌</div>
                  )}
                </div>
              ))}

              {/* Invite modal */}
              {fwShowInvite && (
                <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:24}}>
                  <div style={{background:T.bgCard,borderRadius:20,padding:24,width:"100%",maxWidth:340,boxShadow:"0 20px 60px rgba(0,0,0,0.4)"}}>
                    <div style={{fontSize:15,fontWeight:900,color:T.text,marginBottom:6}}>Invite Family Member</div>
                    <div style={{fontSize:11,color:T.textFaint,marginBottom:16}}>Enter their Google email address. They'll get an invite email with a link to join.</div>
                    <input
                      value={fwInviteEmail}
                      onChange={e=>setFwInviteEmail(e.target.value)}
                      type="email"
                      placeholder="family@gmail.com"
                      style={{width:"100%",boxSizing:"border-box",background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:12,padding:"11px 13px",fontSize:13,color:T.text,outline:"none",marginBottom:10}}
                    />
                    <input
                      value={fwInviteName}
                      onChange={e=>setFwInviteName(e.target.value)}
                      type="text"
                      placeholder="Their name (optional)"
                      style={{width:"100%",boxSizing:"border-box",background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:12,padding:"11px 13px",fontSize:13,color:T.text,outline:"none",marginBottom:10}}
                    />
                    <div style={{fontSize:10,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.07em",fontWeight:700,marginBottom:6}}>Gender</div>
                    <div style={{display:"flex",gap:6,marginBottom:14}}>
                      {[{id:"male",label:"Male",emoji:"👨"},{id:"female",label:"Female",emoji:"👩"},{id:"boy",label:"Boy",emoji:"👦"},{id:"girl",label:"Girl",emoji:"👧"}].map(g=>(
                        <div key={g.id} onClick={()=>setFwInviteGender(g.id)} style={{flex:1,padding:"8px 4px",borderRadius:10,fontSize:11,fontWeight:600,cursor:"pointer",textAlign:"center",background:fwInviteGender===g.id?"rgba(34,197,94,0.2)":isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.04)",border:`1px solid ${fwInviteGender===g.id?"#22C55E":T.border}`,color:fwInviteGender===g.id?"#22C55E":T.textMuted,transition:"all 0.15s"}}>{g.emoji} {g.label}</div>
                      ))}
                    </div>
                    {fwInviteError && <div style={{fontSize:11,color:"#FF3B5C",marginBottom:10}}>{fwInviteError}</div>}
                    <div style={{display:"flex",gap:10}}>
                      <div onClick={()=>{setFwShowInvite(false);setFwInviteEmail("");setFwInviteName("");setFwInviteGender("");setFwInviteError("");}} style={{flex:1,background:T.bgInput,borderRadius:12,padding:"12px",textAlign:"center",cursor:"pointer",fontSize:13,fontWeight:700,color:T.textMuted}}>Cancel</div>
                      <div onClick={fwInviteMember} style={{flex:1,background:fwInviteEmail.includes("@")?"linear-gradient(135deg,#22C55E,#10B981)":"rgba(34,197,94,0.3)",borderRadius:12,padding:"12px",textAlign:"center",cursor:fwInviteStatus==="sending"?"wait":"pointer",fontSize:13,fontWeight:800,color:"#fff"}}>{fwInviteStatus==="sending"?"Sending invite…":"Add & Invite"}</div>
                    </div>
                    {fwInviteStatus==="sent" && <div style={{textAlign:"center",marginTop:10,fontSize:12,fontWeight:700,color:"#22C55E"}}>✅ Member added & invite email sent!</div>}
                    {fwInviteStatus==="error" && <div style={{textAlign:"center",marginTop:10,fontSize:12,fontWeight:700,color:"#FF3B5C"}}>⚠️ Failed to add member — try again</div>}
                  </div>
                </div>
              )}

              {/* Role selection for new users — handled by onboarding flow */}
            </div>}
          </div>
        )}

        </>)}
        {/* ─── END MAIN APP ─── */}

        {/* Modals */}
        {selectedMovie && <MovieDetailModal movie={selectedMovie} isOTT={isOTTMovie} T={T} isDark={isDark} onClose={()=>setSelectedMovie(null)}/>}
      </div>
    </div>
  );
}


