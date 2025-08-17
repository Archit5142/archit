/* =========================
   1) FIREBASE CONFIG
   ========================= */
const firebaseConfig = {
  apiKey: "AIzaSyAk8hV0jAR3G0tCi1Fhw-I4Ln25yDRiGbg",
      authDomain: "trackingapparchit.firebaseapp.com",
      databaseURL: "https://trackingapparchit-default-rtdb.firebaseio.com",
      projectId: "trackingapparchit",
      storageBucket: "trackingapparchit.appspot.com",
      messagingSenderId: "971227243188",
      appId: "1:971227243188:web:6b104c1dc750e429a4ede1"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

const el = id => document.getElementById(id);
function show(page){
  el('loginPage').classList.toggle('hidden', page!=='login');
  el('mapPage').classList.toggle('hidden', page!=='map');
}

/* =========================
   2) AUTH
   ========================= */
function login(){
  const email = el('email').value.trim();
  const password = el('password').value;
  auth.signInWithEmailAndPassword(email,password)
    .then(()=> el('loginStatus').innerHTML='Status: <strong>Signed in</strong>')
    .catch(err=>alert(err.message));
}
function signup(){
  const email = el('email').value.trim();
  const password = el('password').value;
  auth.createUserWithEmailAndPassword(email,password)
    .then(()=>alert('Account created! Please log in.'))
    .catch(err=>alert(err.message));
}
function logout(){ stopTracking(); auth.signOut(); }
auth.onAuthStateChanged(user=>{
  if(user){
    el('authUser').textContent = user.email;
    el('loginStatus').innerHTML='Status: <strong>Signed in</strong>';
    show('map');
    if(!window.__mapReady) initMap();
  }else{
    el('authUser').textContent = '—';
    el('loginStatus').innerHTML='Status: <strong>Signed out</strong>';
    show('login');
  }
});

/* =========================
   3) MAP + TRACKING
   ========================= */
let map, busMarker, meMarker, trackingRef=null, myPos=null, busPos=null, watchId=null;
let lastTs=null;

function initMap(){
  map = new google.maps.Map(document.getElementById('map'),{
    center:{lat:28.6139,lng:77.2090}, zoom:13
  });
  const busIcon = {
    url:"https://cdn-icons-png.flaticon.com/512/61/61205.png",
    scaledSize: new google.maps.Size(50,50)
  };
  busMarker = new google.maps.Marker({map, title:'Bus', icon:busIcon});
  meMarker = new google.maps.Marker({
    map, title:'Me',
    icon:{path:google.maps.SymbolPath.CIRCLE, scale:7, fillColor:'#2563eb', fillOpacity:1, strokeColor:'#fff', strokeWeight:2}
  });
  window.__mapReady=true;
  el('busSelect').addEventListener('change', ()=>{ el('selectedBus').textContent=el('busSelect').value; restartTracking(); });
}

function startTracking(){
  locateMe();
  if(!trackingRef){
    const bus=el('busSelect').value;
    el('selectedBus').textContent=bus;
    trackingRef=db.ref('buses/'+bus);
    trackingRef.on('value', snap=>{
      const v=snap.val();
      if(!v){ el('busStatus').textContent='no data'; el('busStatus').className='bad'; return; }
      busPos={lat:Number(v.lat),lng:Number(v.lng)};
      if(Number.isFinite(busPos.lat)&&Number.isFinite(busPos.lng)){
        busMarker.setPosition(busPos);
        if(!lastTs) map.panTo(busPos);
        lastTs=v.ts||Date.now();
        el('lastUpdate').textContent=fmtTime(lastTs);
        el('busStatus').textContent='online'; el('busStatus').className='ok';
        updateDistance();
      }
    });
  }
}
function stopTracking(){
  if(trackingRef){ trackingRef.off(); trackingRef=null; }
  el('busStatus').textContent='stopped'; el('busStatus').className='bad';
  if(watchId!==null){ navigator.geolocation.clearWatch(watchId); watchId=null; }
}
function restartTracking(){ stopTracking(); startTracking(); }

function locateMe(){
  if(!navigator.geolocation){ alert('No GPS support'); return; }
  navigator.geolocation.getCurrentPosition(pos=>{
    myPos={lat:pos.coords.latitude,lng:pos.coords.longitude};
    meMarker.setPosition(myPos); updateDistance();
  });
  if(watchId===null){
    watchId=navigator.geolocation.watchPosition(pos=>{
      myPos={lat:pos.coords.latitude,lng:pos.coords.longitude};
      meMarker.setPosition(myPos); updateDistance();
    });
  }
}
function updateDistance(){
  if(!busPos||!myPos){ el('distanceKm').textContent='—'; return; }
  const d=haversine(myPos.lat,myPos.lng,busPos.lat,busPos.lng);
  el('distanceKm').textContent=d.toFixed(2)+' km';
}
function haversine(lat1,lon1,lat2,lon2){
  const R=6371,toRad=d=>d*Math.PI/180;
  const dLat=toRad(lat2-lat1),dLon=toRad(lon2-lon1);
  const a=Math.sin(dLat/2)**2+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(a));
}
function fmtTime(ts){ try{ return new Date(Number(ts)).toLocaleString(); }catch{ return '—'; } }
