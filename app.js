// THE NEIGHBORHOOD TRADEOFF — Observable (new notebook editor)
// Put this ENTIRE code into one JavaScript cell. Upload the three files first.
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import {tile as d3tile} from "https://cdn.jsdelivr.net/npm/d3-tile@1/+esm";

const status = document.getElementById("load-status");
async function loadText(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}. Upload the actual file to the data/ folder.`);
  return response.text();
}
async function loadCSV(path) { return d3.csvParse(await loadText(path), d3.autoType); }
async function loadJSON(path) { return JSON.parse(await loadText(path)); }

try {
const neighborhoodDashboard = await (async () => {
  const [main, geo, eve] = await Promise.all([
    loadCSV("./data/bay_area_livability_by_zip.csv"),
    loadJSON("./data/bay_area_livability_by_zip.geojson"),
    loadCSV("./data/bay_area_livability_by_zip_with_rough_coords.csv")
  ]);
  const zipKey = value => {
    const s = String(value ?? "").trim().replace(/\.0$/, "");
    return /^\d{1,5}$/.test(s) ? s.padStart(5, "0") : s;
  };
  const numeric = v => v == null || v === "" ? null : (Number.isFinite(+v) ? +v : null);
  const firstNumeric = (obj, keys) => {
    for (const k of keys) {
      const n = numeric(obj?.[k]);
      if (n !== null) return n;
    }
    return null;
  };
  const money = n => n == null || !Number.isFinite(n) ? "N/A" : "$" + Math.round(n).toLocaleString();
  const signedMoney = n => n == null || !Number.isFinite(n) ? "N/A" : `${n > 0 ? "+" : n < 0 ? "−" : ""}${money(Math.abs(n))}`;
  const shortNumber = n => Number.isFinite(n) ? d3.format(",.1f")(n) : "N/A";
  const metrics = [
    {key:"Transit_Stops_Per_Sq_Mile", label:"Transit"},
    {key:"Grocery_Per_Sq_Mile", label:"Groceries"},
    {key:"Food_Drink_Per_Sq_Mile", label:"Food & drink"},
    {key:"Healthcare_Per_Sq_Mile", label:"Healthcare"},
    {key:"Education_Per_Sq_Mile", label:"Education"},
    {key:"Recreation_Per_Sq_Mile", label:"Recreation"}
  ];
  const eveByZip = new Map(eve.map(d => [zipKey(d.ZIP ?? d.RegionName), d]));
  const dates = Object.keys(main[0] ?? {}).filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k) && k >= "2024-01-31" && k <= "2026-08-31").sort();
  const parsedDates = dates.map(d => new Date(d + "T00:00:00"));

  const rows = main.map(d => {
    const zip = zipKey(d.ZIP ?? d.RegionName);
    const er = eveByZip.get(zip) ?? {};
    const startRent = firstNumeric(er, ["AvgRent2022","Avg_Rent_2022","Rent2022"])
      ?? firstNumeric(d, ["AvgRent2022","Avg_Rent_2022","Rent2022"]);
    const endRent = firstNumeric(er, ["AvgRent2026","Avg_Rent_2026","Rent2026"])
      ?? firstNumeric(d, ["AvgRent2026","Avg_Rent_2026","Rent2026"]);
    return {
      zip,
      city: d.City || er.City || "Unknown",
      county: String(d.CountyName || er.CountyName || "Unknown").replace(/ County$/i,""),
      rent: numeric(d.Current_ZORI),
      amenities: numeric(d.Amenities_Per_Sq_Mile),
      transit: numeric(d.Transit_Stops_Per_Sq_Mile),
      rentChange: firstNumeric(er, ["RentIncrease", "Rent_Increase", "rentIncrease"]) ?? (startRent !== null && endRent !== null ? endRent - startRent : null),
      values: Object.fromEntries(metrics.map(m => [m.key, numeric(d[m.key])])),
      history: dates.map(date => {
        const n = numeric(d[date]);
        return n !== null && n > 0 ? n : null;
      }),
      pct: {}
    };
  }).filter(d => d.zip);
  const byZip = new Map(rows.map(d => [d.zip, d]));
  // Match Molly's method: split ZIPs with valid endpoint rents and transit data into thirds.
  const transitEligible = rows.filter(d => d.transit !== null && Number.isFinite(d.transit) && d.history[0] > 0 && d.history.at(-1) > 0)
    .sort((a,b) => d3.ascending(a.transit,b.transit));
  const groupNames = ["Low transit", "Medium transit", "High transit"];
  const groupColor = new Map([["Low transit", "#4e79a7"],["Medium transit", "#f28e2b"],["High transit", "#59a14f"]]);
  transitEligible.forEach((d,i) => d.transitGroup = groupNames[Math.min(2,Math.floor(i * 3 / transitEligible.length))]);
  for (const key of [...metrics.map(m => m.key), "rent"]) {
    const accessor = d => key === "rent" ? d.rent : d.values[key];
    const sorted = rows.map(accessor).filter(n => n !== null && n >= 0 && (key !== "rent" || n > 0)).sort(d3.ascending);
    for (const d of rows) {
      const v = accessor(d);
      if (v === null || v < 0 || (key === "rent" && v <= 0) || !sorted.length) {d.pct[key] = null; continue;}
      const lo = d3.bisectLeft(sorted,v), hi = d3.bisectRight(sorted,v);
      d.pct[key] = sorted.length === 1 ? .5 : ((lo + hi - 1)/2)/(sorted.length-1);
    }
  }
  const overallAccess = d => d3.mean(metrics.map(m => d.pct[m.key]).filter(v => v !== null)) ?? -1;

  const counties=[...new Set(rows.map(d=>d.county))].sort(d3.ascending);
  const validChanges=rows.map(d=>d.rentChange).filter(Number.isFinite);
  const maxAbsChange=d3.max(validChanges,d=>Math.abs(d))||1;
  const mapColor=d3.scaleDiverging([-maxAbsChange,0,maxAbsChange],d3.interpolatePiYG);

  const root=d3.create("div").attr("class","nt-dashboard");
  root.append("style").text(`
  .nt-dashboard{--ink:#262637;--muted:#6b7286;--lav:#7659a8;--line:#e9e6ef;font-family:Inter,system-ui,Arial,sans-serif;max-width:1140px;margin:0 auto;color:var(--ink);background:#fff}
  .nt-dashboard *{box-sizing:border-box}.nt-dashboard h2{font-size:clamp(27px,3vw,38px);letter-spacing:-1.1px;line-height:1.13;margin:8px 0 10px}.nt-dashboard h3{font-size:17px;margin:0 0 7px}.nt-dashboard p{font-size:13px;color:var(--muted);line-height:1.55;margin:0}
  .nt-dashboard .intro{padding:22px 8px 23px;border-bottom:1px solid var(--line)}.nt-dashboard .eyebrow{color:var(--lav);font-size:11px;font-weight:800;letter-spacing:1.5px}.nt-dashboard .intro>p{max-width:720px;font-size:14px}
  .nt-dashboard .toolbar{display:flex;align-items:end;flex-wrap:wrap;gap:13px;margin-top:19px}.nt-dashboard label{display:block;font-size:11px;font-weight:750;color:#4a4b5c;margin-bottom:5px}.nt-dashboard input,.nt-dashboard select{font:inherit;border:1px solid #d9d4e2;padding:9px 11px;border-radius:9px;background:white;font-size:12px;color:var(--ink)}.nt-dashboard button{font:inherit;font-size:12px;background:#f4effb;border:1px solid #e2d9ef;color:#5e468c;cursor:pointer;padding:9px 13px;border-radius:9px;font-weight:650}.nt-dashboard button:hover{background:#e8dcf8}.nt-dashboard input:focus-visible,.nt-dashboard button:focus-visible,.nt-dashboard select:focus-visible{outline:2px solid #a88bd0}
  .nt-dashboard .main-grid{display:grid;grid-template-columns:minmax(0,1.18fr) minmax(0,.82fr);gap:20px;margin-top:24px;align-items:start}.nt-dashboard .map-side{min-width:0}.nt-dashboard .side{min-width:0;display:flex;flex-direction:column;gap:16px}
  .nt-dashboard .card{border:1px solid var(--line);border-radius:16px;padding:18px;min-width:0;background:white}.nt-dashboard .card-title{font-weight:800;font-size:17px;margin-bottom:5px}.nt-dashboard .meta{font-size:11px;color:var(--muted)}.nt-dashboard .map-frame{position:relative;margin-top:12px;border-radius:11px;overflow:hidden;background:#e9edf1}.nt-dashboard .map-frame svg{display:block;width:100%;height:auto;touch-action:none}.nt-dashboard .map-frame .zip-shape{cursor:pointer;stroke:#383746;stroke-width:.55;vector-effect:non-scaling-stroke}.nt-dashboard .map-frame .zip-shape:hover{stroke:#171827;stroke-width:2}.nt-dashboard .map-frame .zip-shape.selected{stroke:#f1b942;stroke-width:3.5;filter:drop-shadow(0 0 1px #111)}
  .nt-dashboard .map-attrib{font-size:9px;fill:#333;stroke:#fff;stroke-width:3px;paint-order:stroke}.nt-dashboard .tooltip{position:absolute;pointer-events:none;z-index:5;background:#282334;color:white;padding:8px 11px;border-radius:8px;font-size:11px;max-width:225px;display:none;box-shadow:0 5px 15px #0002}.nt-dashboard .ramp-row{display:flex;align-items:center;gap:10px;margin-top:11px;font-size:11px;color:var(--muted)}.nt-dashboard .ramp{flex:1;height:10px;border-radius:10px;background:linear-gradient(90deg,#762a83,#f7f7f7,#1b7837)}
  .nt-dashboard .overlay-controls{display:flex;align-items:center;gap:11px;margin-top:11px;font-size:11px;color:var(--muted)}.nt-dashboard .overlay-controls label{margin:0;white-space:nowrap}.nt-dashboard .overlay-controls input{flex:1;min-width:55px;accent-color:#7659a8}.nt-dashboard .overlay-controls span{width:35px;text-align:right;font-variant-numeric:tabular-nums}
  .nt-dashboard .summary-strip{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}.nt-dashboard .stat{flex:1;min-width:110px;background:#f8f6fa;border-radius:10px;padding:11px}.nt-dashboard .stat b{display:block;font-size:20px;letter-spacing:-.5px}.nt-dashboard .stat span{font-size:10px;color:var(--muted)}
  .nt-dashboard .hint{margin-top:12px;font-size:12px;color:var(--muted);line-height:1.5}.nt-dashboard .snapshot-head{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}.nt-dashboard .chip{font-size:10px;color:#6f579a;background:#f3edfa;padding:5px 7px;border-radius:20px;white-space:nowrap}.nt-dashboard .snapshot-metrics{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:13px 0 15px}.nt-dashboard .metric-box{background:#f9f7fc;padding:11px;border-radius:10px}.nt-dashboard .metric-box b{font-size:21px;letter-spacing:-.5px;display:block}.nt-dashboard .metric-box span{font-size:11px;color:var(--muted)}
  .nt-dashboard .profile-row{display:grid;grid-template-columns:92px minmax(0,1fr) 37px;align-items:center;gap:8px;margin:9px 0;font-size:11px}.nt-dashboard .track{height:9px;border-radius:12px;background:#eeeaf4;overflow:hidden}.nt-dashboard .fill{height:100%;background:#8263b9;border-radius:12px}.nt-dashboard .muted{color:var(--muted)}.nt-dashboard .chart-svg{display:block;width:100%;height:auto;max-width:100%}.nt-dashboard .axis text{fill:#757488;font-size:10px}.nt-dashboard .axis path,.nt-dashboard .axis line{stroke:#d7d7df}.nt-dashboard .chart-note{font-size:11px;color:var(--muted);margin-top:7px}.nt-dashboard .chart-key{font-size:11px;color:var(--muted);display:flex;flex-wrap:wrap;gap:9px;margin-top:6px}.nt-dashboard .key-dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:4px}
  .nt-dashboard .bottom{margin-top:18px;border-top:1px solid var(--line);padding:20px 0 3px}.nt-dashboard .bottom-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:start}.nt-dashboard .fineprint{font-size:11px;color:var(--muted);line-height:1.65;margin-top:14px}.nt-dashboard details{margin-top:17px;font-size:12px;color:var(--muted)}.nt-dashboard summary{cursor:pointer;color:#65527f;font-weight:700}
  @media(max-width:830px){.nt-dashboard .main-grid,.nt-dashboard .bottom-grid{grid-template-columns:1fr}.nt-dashboard .intro{padding-left:5px}.nt-dashboard .snapshot-metrics{grid-template-columns:1fr 1fr}}
  `);
  const intro=root.append("div").attr("class","intro");
  intro.append("div").attr("class","eyebrow").text("BAY AREA LIVABILITY EXPLORER");
  intro.append("h2").text("The Neighborhood Tradeoff");
  intro.append("p").text("What does your rent get you? Zoom into a part of the Bay Area to compare affordability and nearby amenities. Click a ZIP code to uncover its story.");
  const toolbar=intro.append("div").attr("class","toolbar");
  const countyControl=toolbar.append("div");countyControl.append("label").text("Explore a county");
  const countySelect=countyControl.append("select");countySelect.selectAll("option").data(["All",...counties]).join("option").attr("value",d=>d).text(d=>d==="All"?"All Bay Area counties":d+" County");
  const searchControl=toolbar.append("div");searchControl.append("label").text("Look up a ZIP");
  const zipInput=searchControl.append("input").attr("type","search").attr("placeholder","e.g. 94110").attr("maxlength",5).attr("size",11);
  const clearBtn=toolbar.append("button").text("Clear selection");
  const mainGrid=root.append("div").attr("class","main-grid");
  const mapSide=mainGrid.append("div").attr("class","map-side");
  const mapCard=mapSide.append("section").attr("class","card");
  mapCard.append("div").attr("class","card-title").text("Explore the Bay Area");
  mapCard.append("p").text("ZIP colors show change in monthly rent from 2022 to 2026, over OpenStreetMap. Adjust transparency to see place names; zoom to filter the comparison.");
  const mapViewport=mapCard.append("div").attr("class","map-frame");
  const mapLegend=mapCard.append("div").attr("class","ramp-row");mapLegend.append("span").text("Fell");mapLegend.append("div").attr("class","ramp");mapLegend.append("span").text("Rose");
  mapCard.append("div").attr("class","meta").style("text-align","center").style("margin-top","6px").text(`Rent change scale centered on $0 · ±${money(maxAbsChange)}/mo`);
  // Eve's transparent ZIP overlay: adjust how clearly the basemap shows through.
  const overlayControl=mapCard.append("div").attr("class","overlay-controls");
  overlayControl.append("label").attr("for","nt-overlay-opacity").text("ZIP color intensity");
  const opacitySlider=overlayControl.append("input").attr("id","nt-overlay-opacity")
    .attr("type","range").attr("min",0.15).attr("max",0.95).attr("step",0.05).property("value",0.72);
  const opacityLabel=overlayControl.append("span").text("72%");
  let overlayOpacity=0.72;

  const mapBtns=mapCard.append("div").style("display","flex").style("gap","8px").style("margin-top","11px");
  const mapReset=mapBtns.append("button").text("↺ Reset map");
  const mapInfo=mapCard.append("div").attr("class","summary-strip");
  const countStat=mapInfo.append("div").attr("class","stat");const rentStat=mapInfo.append("div").attr("class","stat");
  mapCard.append("div").attr("class","hint").text("The analysis follows the ZIP-code centroids inside the current map view. Zoom or pan to compare a smaller area.");
  const side=mainGrid.append("div").attr("class","side");
  const snapshot=side.append("section").attr("class","card");
  const snapshotTitle=snapshot.append("div").attr("class","snapshot-head");
  const nameBlock=snapshotTitle.append("div");nameBlock.append("div").attr("class","eyebrow").text("NEIGHBORHOOD SNAPSHOT");
  const nameTitle=nameBlock.append("h3").style("margin-top","7px");
  const chip=snapshotTitle.append("span").attr("class","chip");
  const selectedSummary=snapshot.append("p").style("margin-top","5px");
  const snapshotMetrics=snapshot.append("div").attr("class","snapshot-metrics");
  const rentBox=snapshotMetrics.append("div").attr("class","metric-box");const changeBox=snapshotMetrics.append("div").attr("class","metric-box");
  snapshot.append("div").style("font-size","12px").style("font-weight","750").text("Everyday amenity access");
  const profile=snapshot.append("div");
  snapshot.append("p").style("font-size","11px").style("margin-top","9px").text("Bars show each ZIP's relative percentile among all ZIPs in this dataset, not walking distance or quality.");
  const compare=side.append("section").attr("class","card");
  compare.append("div").attr("class","card-title").text("What does convenience cost here?");
  compare.append("p").text("Each dot is a ZIP in the map view. Find the selected neighborhood among nearby rent and amenity combinations.");
  const scatterBox=compare.append("div");
  const scatterNote=compare.append("div").attr("class","chart-note");
  const bottom=root.append("section").attr("class","bottom");
  bottom.append("div").attr("class","eyebrow").text("THE BIGGER PICTURE");
  bottom.append("h3").style("margin-top","7px").text("Has the cost of convenience changed over time?");
  bottom.append("p").text("Molly's transit-access comparison adds historical context. The selected ZIP appears as a purple dashed line, compared with the transit-access groups in your current map view.");
  const bottomGrid=bottom.append("div").attr("class","bottom-grid").style("margin-top","14px");
  const lineCard=bottomGrid.append("div").attr("class","card");
  lineCard.append("div").attr("class","card-title").text("Rent trends · 2024–2026");
  const lineBox=lineCard.append("div");const lineLegend=lineCard.append("div").attr("class","chart-key");
  const contextCard=bottomGrid.append("div").attr("class","card");
  contextCard.append("div").attr("class","card-title").text("How to read the tradeoff");
  const contextText=contextCard.append("p");
  const contextStats=contextCard.append("div").attr("class","summary-strip");
  const contextA=contextStats.append("div").attr("class","stat");const contextB=contextStats.append("div").attr("class","stat");
  contextCard.append("p").style("margin-top","13px").text("Compare neighborhoods with similar amenities, then inspect the difference in rent. Density is measured per square mile, and these observational patterns do not show that amenities cause rent changes.");
  const details=root.append("details");details.append("summary").text("About the data and measures");
  details.append("p").style("margin-top","9px").text("Map: 2026 minus 2022 average rent using Eve's coordinates dataset; scatter: Current_ZORI vs Amenities_Per_Sq_Mile; profiles: percentile density across the full dataset; historical chart: Molly's low/medium/high transit terciles based on ZIPs with complete endpoints and transit density. Date windows differ across the charts. ZIPs enter map-filtered views if their geographic centroid is visible. Observational associations are not causal.");
  const tooltip=mapViewport.append("div").attr("class","tooltip");

  let county="All",selectedZip=null,mapTransform=d3.zoomIdentity,geoFiltered=false;
  let geographicVisible=new Set(rows.map(d=>d.zip));
  const visible=()=>rows.filter(d=>(county==="All"||d.county===county)&&geographicVisible.has(d.zip));
  function choose(zip){selectedZip=zip&&byZip.has(zip)?zip:null;zipInput.property("value",selectedZip||"");renderAll();}
  countySelect.on("change",()=>{county=countySelect.property("value");if(selectedZip&&!visible().some(d=>d.zip===selectedZip))selectedZip=null;renderAll();});
  zipInput.on("change",()=>{const z=zipKey(zipInput.property("value"));const found=byZip.get(z);if(!found){selectedSummary.text(`ZIP ${z} isn't in the dataset.`);return;}if(county!=="All"&&found.county!==county){county="All";countySelect.property("value","All");}choose(z);});
  clearBtn.on("click",()=>choose(null));
  // MAP: keep the OpenStreetMap tile layer and vector ZIPs inside the SAME zoom handler.
  const mw = 720, mh = 580;
  const mapSvg = mapViewport.append("svg").attr("viewBox",`0 0 ${mw} ${mh}`).attr("aria-label","Map of Bay Area ZIP codes colored by monthly rent change");
  const mapClipID = `mapclip-${Math.random().toString(36).slice(2)}`;
  mapSvg.append("defs").append("clipPath").attr("id",mapClipID).append("rect").attr("width",mw).attr("height",mh);
  const mapProjection = d3.geoMercator().fitExtent([[18,18],[mw-18,mh-18]],geo);
  const geoPath = d3.geoPath(mapProjection);
  const [[boundX0,boundY0],[boundX1,boundY1]]=geoPath.bounds(geo);
  // Permit a little outside-map panning, but avoid losing the Bay Area altogether.
  const mapDragExtent=[[Math.min(-50,boundX0-90),Math.min(-50,boundY0-90)],
                       [Math.max(mw+50,boundX1+90),Math.max(mh+50,boundY1+90)]];

  const worldK = mapProjection.scale() * 2 * Math.PI;
  const [tx,ty] = mapProjection.translate();
  const tileMaker = d3tile().extent([[0,0],[mw,mh]]).tileSize(256);
  const tileUrl = (x,y,z) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
  const mapClipped = mapSvg.append("g").attr("clip-path",`url(#${mapClipID})`);
  const tileLayer = mapClipped.append("g").style("pointer-events","none");
  const geometryLayer = mapClipped.append("g");
  mapSvg.append("text").attr("class","map-attrib").attr("x",mw-8).attr("y",mh-8).attr("text-anchor","end").text("© OpenStreetMap contributors");
  const geoFeatures = geo.features.filter(f => byZip.has(zipKey(f.properties?.ZIP ?? f.properties?.zip ?? f.properties?.ZCTA5CE20 ?? f.properties?.ZCTA5CE10)));
  const zipPaths = geometryLayer.selectAll("path").data(geoFeatures).join("path")
    .attr("class","zip-shape").attr("d",geoPath)
    .on("click",(ev,f)=>{ev.stopPropagation();choose(zipKey(f.properties?.ZIP ?? f.properties?.zip ?? f.properties?.ZCTA5CE20 ?? f.properties?.ZCTA5CE10));})
    .on("mousemove",(ev,f)=>{
      const d=byZip.get(zipKey(f.properties?.ZIP ?? f.properties?.zip ?? f.properties?.ZCTA5CE20 ?? f.properties?.ZCTA5CE10));
      if(!d)return;
      tooltip.style("display","block").html(`<strong>${d.city} · ${d.zip}</strong><br>2022–2026 rent change: ${signedMoney(d.rentChange)}/mo`);
      const box=mapViewport.node().getBoundingClientRect();
      tooltip.style("left",Math.min(ev.clientX-box.left+12,box.width-210)+"px").style("top",Math.max(8,ev.clientY-box.top-45)+"px");
    }).on("mouseleave",()=>tooltip.style("display","none"));
  const shapeCentroids = new Map(geoFeatures.map(f => [zipKey(f.properties?.ZIP ?? f.properties?.zip ?? f.properties?.ZCTA5CE20 ?? f.properties?.ZCTA5CE10),geoPath.centroid(f)]));
  let pendingGeoRender = false;
  function zoomed(ev) {
    const transform = ev.transform;
    mapTransform = transform;
    geometryLayer.attr("transform",transform);
    const tiles = tileMaker({k:transform.k*worldK,x:transform.x+transform.k*tx,y:transform.y+transform.k*ty});
    tileLayer.selectAll("image").data(tiles,d=>d.join("/")).join("image")
      .attr("href",d=>tileUrl(...d))
      .attr("x",d=>(d[0]+tiles.translate[0])*tiles.scale)
      .attr("y",d=>(d[1]+tiles.translate[1])*tiles.scale)
      .attr("width",tiles.scale).attr("height",tiles.scale);
    // Facet the linked views by the current map viewport, using ZIP polygon centroids.
    // At the initial extent, include all records. Subsequent navigation filters the charts.
    if (!pendingGeoRender) {
      pendingGeoRender = true;
      requestAnimationFrame(() => {
        pendingGeoRender = false;
        geoFiltered = transform.k > 1.06 || Math.abs(transform.x)>8 || Math.abs(transform.y)>8;
        geographicVisible = geoFiltered
          ? new Set([...shapeCentroids].filter(([zip,p]) => {
              const q=mapTransform.apply(p);
              return q[0]>=0 && q[0]<=mw && q[1]>=0 && q[1]<=mh;
            }).map(([zip])=>zip))
          : new Set(rows.map(d=>d.zip));
        if (selectedZip && !geographicVisible.has(selectedZip)) selectedZip = null;
        renderAll();
      });
    }
  }
  const zoom = d3.zoom().scaleExtent([1,10]).translateExtent(mapDragExtent).on("zoom",zoomed);
  mapReset.on("click",() => mapSvg.transition().duration(400).call(zoom.transform,d3.zoomIdentity));
  mapSvg.call(zoom).on("dblclick.zoom",null);
  mapSvg.call(zoom.transform,d3.zoomIdentity);

  function drawMap(){
    const vis=new Set(visible().map(d=>d.zip));
    zipPaths.attr("fill",f=>{const d=byZip.get(zipKey(f.properties?.ZIP??f.properties?.zip??f.properties?.ZCTA5CE20??f.properties?.ZCTA5CE10));return d?.rentChange==null?"#a9a8ad":mapColor(d.rentChange);})
      .attr("fill-opacity",f=>vis.has(zipKey(f.properties?.ZIP??f.properties?.zip??f.properties?.ZCTA5CE20??f.properties?.ZCTA5CE10)) ? overlayOpacity : 0.08)
      .classed("selected",f=>zipKey(f.properties?.ZIP??f.properties?.zip??f.properties?.ZCTA5CE20??f.properties?.ZCTA5CE10)===selectedZip);
    zipPaths.filter(f=>zipKey(f.properties?.ZIP??f.properties?.zip??f.properties?.ZCTA5CE20??f.properties?.ZCTA5CE10)===selectedZip).raise();
  }
  opacitySlider.on("input",()=>{
    overlayOpacity=Math.max(0.15,Math.min(0.95,+opacitySlider.property("value")));
    opacityLabel.text(`${Math.round(overlayOpacity*100)}%`);
    drawMap();
  });
  function drawSnapshot(){
    const d=byZip.get(selectedZip);
    nameTitle.text(d?`${d.city} · ${d.zip}`:"Choose a ZIP code");
    chip.text(d?`${d.county} County`:"Start exploring");
    selectedSummary.text(d?"Explore this ZIP's affordability and relative access across six everyday categories.":"Click any ZIP on the map or any dot in the scatterplot to reveal neighborhood details here.");
    rentBox.html(`<b>${d?money(d.rent):"—"}</b><span>Current monthly rent</span>`);
    changeBox.html(`<b>${d?signedMoney(d.rentChange):"—"}</b><span>2022–2026 monthly change</span>`);
    profile.selectAll("*").remove();
    if(!d){profile.append("div").attr("class","hint").text("Select a neighborhood to see its transit, grocery, dining, healthcare, education and recreation profile.");return;}
    const lines=profile.selectAll("div.profile-row").data(metrics).join("div").attr("class","profile-row");
    lines.append("span").text(m=>m.label);
    const tracks=lines.append("div").attr("class","track");tracks.append("div").attr("class","fill").style("width",m=>`${Math.max(0,100*(d.pct[m.key]??0))}%`);
    lines.append("span").attr("class","muted").style("text-align","right").text(m=>d.pct[m.key]===null?"N/A":`${Math.round(100*d.pct[m.key])}th`);
    lines.append("title").text(m=>`${m.label}: ${shortNumber(d.values[m.key])} per sq. mile`);
  }
  function drawScatter(){
    scatterBox.selectAll("*").remove();
    const data=visible().filter(d=>d.rent>0&&d.amenities!==null&&d.amenities>=0);
    const W=510,H=330,m={top:17,right:17,bottom:45,left:64};
    const svg=scatterBox.append("svg").attr("class","chart-svg").attr("viewBox",`0 0 ${W} ${H}`);
    if(!data.length){svg.append("text").attr("x",30).attr("y",60).text("No comparable ZIPs in this view.");return;}
    const maxX=d3.max(data,d=>d.amenities)||1;
    const x=d3.scaleLinear().domain([0,maxX]).nice().range([m.left,W-m.right]);
    let [lo,hi]=d3.extent(data,d=>d.rent);if(lo===hi){lo-=100;hi+=100;}
    const y=d3.scaleLinear().domain([lo,hi]).nice().range([H-m.bottom,m.top]);
    for(const v of y.ticks(5))svg.append("line").attr("x1",m.left).attr("x2",W-m.right).attr("y1",y(v)).attr("y2",y(v)).attr("stroke","#f0eef2");
    svg.append("g").attr("class","axis").attr("transform",`translate(0,${H-m.bottom})`).call(d3.axisBottom(x).ticks(5));
    svg.append("g").attr("class","axis").attr("transform",`translate(${m.left},0)`).call(d3.axisLeft(y).ticks(5).tickFormat(d=>"$"+d3.format("~s")(d)));
    svg.append("text").attr("x",(m.left+W-m.right)/2).attr("y",H-5).attr("text-anchor","middle").attr("font-size",11).text("Amenities per square mile");
    svg.append("text").attr("transform","rotate(-90)").attr("x",-H/2).attr("y",14).attr("text-anchor","middle").attr("font-size",11).text("Monthly rent");
    const meanX=d3.mean(data,d=>d.amenities),meanY=d3.mean(data,d=>d.rent);
    const denom=d3.sum(data,d=>(d.amenities-meanX)**2);
    if(denom>0){const slope=d3.sum(data,d=>(d.amenities-meanX)*(d.rent-meanY))/denom,intercept=meanY-slope*meanX;
      const a=d3.min(data,d=>d.amenities),b=d3.max(data,d=>d.amenities);
      svg.append("line").attr("x1",x(a)).attr("y1",y(intercept+slope*a)).attr("x2",x(b)).attr("y2",y(intercept+slope*b)).attr("stroke","#e39a65").attr("stroke-width",2).attr("stroke-dasharray","5,4");}
    svg.selectAll("circle.point").data(data,d=>d.zip).join("circle").attr("class","point")
      .attr("cx",d=>x(d.amenities)).attr("cy",d=>y(d.rent)).attr("r",d=>d.zip===selectedZip?7:4)
      .attr("fill",d=>d.zip===selectedZip?"#7655a9":"#7395bc").attr("fill-opacity",d=>d.zip===selectedZip?1:.57)
      .attr("stroke",d=>d.zip===selectedZip?"#30223f":"#fff").attr("stroke-width",d=>d.zip===selectedZip?2:0.8)
      .style("cursor","pointer").on("click",(event,d)=>choose(d.zip))
      .append("title").text(d=>`${d.city} (${d.zip})\nRent: ${money(d.rent)}/mo\nAmenities: ${shortNumber(d.amenities)} per sq. mile`);
    svg.selectAll("circle.point").filter(d=>d.zip===selectedZip).raise();
    scatterNote.text(`${data.length} ZIP codes in view · dashed orange line represents the local linear trend`);
  }
  function drawTrends(){
    lineBox.selectAll("*").remove();lineLegend.selectAll("*").remove();
    const W=520,H=295,m={top:16,right:15,bottom:45,left:65};
    const svg=lineBox.append("svg").attr("class","chart-svg").attr("viewBox",`0 0 ${W} ${H}`);
    const area=visible().filter(d=>d.transitGroup);
    const series=groupNames.map(group=>({group,values:dates.map((_,i)=>({date:parsedDates[i],rent:d3.mean(area.filter(d=>d.transitGroup===group),d=>d.history[i]>0?d.history[i]:undefined)}))})).filter(s=>s.values.some(v=>Number.isFinite(v.rent)));
    const d=byZip.get(selectedZip);
    if(d&&d.history.some(v=>v>0))series.push({group:"Selected ZIP",values:dates.map((_,i)=>({date:parsedDates[i],rent:d.history[i]}))});
    if(!series.length||!dates.length){svg.append("text").attr("x",25).attr("y",50).text("Rent history unavailable for this view.");return;}
    const vals=series.flatMap(s=>s.values.map(v=>v.rent).filter(Number.isFinite));
    let [lo,hi]=d3.extent(vals);if(lo===hi){lo-=100;hi+=100;}
    const y=d3.scaleLinear().domain([lo,hi]).nice().range([H-m.bottom,m.top]);
    const x=d3.scaleTime().domain(d3.extent(parsedDates)).range([m.left,W-m.right]);
    svg.append("g").attr("class","axis").attr("transform",`translate(0,${H-m.bottom})`).call(d3.axisBottom(x).ticks(d3.timeMonth.every(6)).tickFormat(d3.timeFormat("%b '%y")));
    svg.append("g").attr("class","axis").attr("transform",`translate(${m.left},0)`).call(d3.axisLeft(y).ticks(5).tickFormat(d=>"$"+d3.format("~s")(d)));
    const line=d3.line().defined(v=>Number.isFinite(v.rent)).x(v=>x(v.date)).y(v=>y(v.rent));
    svg.selectAll("path.rent-series").data(series).join("path").attr("class","rent-series")
      .attr("d",s=>line(s.values)).attr("fill","none")
      .attr("stroke",s=>s.group==="Selected ZIP"?"#7655a9":groupColor.get(s.group))
      .attr("stroke-width",s=>s.group==="Selected ZIP"?3.3:2.1)
      .attr("stroke-dasharray",s=>s.group==="Selected ZIP"?"6 4":null);
    for(const s of series){const item=lineLegend.append("span");item.append("span").attr("class","key-dot").style("background",s.group==="Selected ZIP"?"#7655a9":groupColor.get(s.group));item.append("span").text(s.group);}
  }
  function renderAll(){
    const area=visible(),rents=area.filter(d=>d.rent>0);
    countStat.html(`<b>${area.length}</b><span>ZIP codes in view</span>`);
    rentStat.html(`<b>${money(d3.mean(rents,d=>d.rent))}</b><span>Average monthly rent</span>`);
    const avgAmenities=d3.mean(area.filter(d=>d.amenities!==null),d=>d.amenities);
    contextA.html(`<b>${shortNumber(avgAmenities)}</b><span>Average amenities / sq. mile</span>`);
    contextB.html(`<b>${area.length}</b><span>ZIP codes being compared</span>`);
    contextText.text(selectedZip?`You selected ${byZip.get(selectedZip).city} (${selectedZip}). Its point is highlighted in the scatterplot and its history is shown alongside regional transit groups.`:`Explore the map to change the comparison group. Then select a ZIP to compare its rent and amenities against the surrounding area.`);
    drawMap();drawSnapshot();drawScatter();drawTrends();
  }
  renderAll();
  return root.node();
})();
document.getElementById("dashboard-root").replaceChildren(neighborhoodDashboard);
status.hidden = true;
} catch(error) {
  status.textContent = `Dashboard could not load: ${error?.message||String(error)}`;
  status.hidden = false;
  console.error(error);
}
