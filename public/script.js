const API = "/api";
const socket = io();

const map = L.map('map').setView([14.89, 100.40], 10);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

async function loadAll() {
  const stations = await fetch(`${API}/stations`).then(r=>r.json());
  const trucks = await fetch(`${API}/trucks`).then(r=>r.json());

  document.getElementById("stations").innerHTML = "";
  document.getElementById("totalStations").innerText = "ปั๊มทั้งหมด: "+stations.length;

  stations.forEach(s => {
    L.marker([s.lat,s.lng]).addTo(map)
      .bindPopup(`<b>${s.name}</b><br>
      <button onclick="openMap(${s.lat},${s.lng})">📍 นำทาง</button>`);

    document.getElementById("stations").innerHTML += `
      <div class="card">
        <b>${s.name}</b><br>
        ดีเซล: ${s.fuels.diesel}%<br>
        G95: ${s.fuels.G95}%<br>
        G91: ${s.fuels.G91}%<br>
        E20: ${s.fuels.E20}%<br>
        <button onclick="openMap(${s.lat},${s.lng})">📍 นำทาง</button>
      </div>
    `;

    // แจ้งเตือนน้ำมันหมด
    Object.entries(s.fuels).forEach(([fuel, val])=>{
      if(val===0) alert(`⚠️ ${s.name} หมดน้ำมัน ${fuel}`);
    });
  });

  trucks.forEach(t=>{
    L.circle([t.lat,t.lng], { radius: 3000, color:'red' })
      .addTo(map)
      .bindPopup(`🚚 ${t.license} - ${t.status}`);
  });
}

function openMap(lat,lng){
  window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
}

socket.on('update', loadAll);
loadAll();