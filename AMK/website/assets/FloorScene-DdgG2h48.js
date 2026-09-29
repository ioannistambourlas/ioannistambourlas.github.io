import{r as g,j as _,F as E}from"./index-DLp5lYlm.js";const M=`
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`,F=`
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uPortrait;

const float WALL_Z = -5.2;
const vec2 WIN_MIN = vec2(-1.35, 0.55);
const vec2 WIN_MAX = vec2(1.35, 2.75);

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}

// Chip colours sampled from AMK's stairwell photo (+ an occasional plum chip).
vec3 chipColour(float r) {
  if (r < 0.30) return vec3(0.97, 0.965, 0.955);
  if (r < 0.55) return vec3(0.86, 0.85, 0.83);
  if (r < 0.74) return vec3(0.72, 0.71, 0.69);
  if (r < 0.88) return vec3(0.55, 0.54, 0.52);
  if (r < 0.975) return vec3(0.26, 0.25, 0.24);
  return vec3(0.44, 0.11, 0.33);
}

// One Voronoi layer of chips: returns colour and coverage.
vec4 chips(vec2 p, float fill) {
  vec2 ip = floor(p);
  vec2 fp = fract(p);
  float d1 = 8.0, d2 = 8.0;
  vec2 id1 = vec2(0.0);
  for (int j = -1; j <= 1; j++)
  for (int i = -1; i <= 1; i++) {
    vec2 g = vec2(float(i), float(j));
    vec2 o = hash22(ip + g);
    vec2 r = g + o - fp;
    float d = dot(r, r);
    if (d < d1) { d2 = d1; d1 = d; id1 = ip + g; }
    else if (d < d2) { d2 = d; }
  }
  float edge = sqrt(d2) - sqrt(d1);
  float present = step(1.0 - fill, hash12(id1 * 1.7 + 3.1));
  float w = fwidth(edge) + 0.02;
  float cover = present * smoothstep(0.10, 0.10 + w, edge);
  return vec4(chipColour(hash12(id1 + 11.3)), cover);
}

vec3 terrazzo(vec2 xz) {
  vec3 binder = vec3(0.94, 0.93, 0.91);
  vec3 avg = vec3(0.835, 0.825, 0.81);
  vec2 p1 = xz * 30.0;
  vec2 p2 = xz * 64.0 + 17.0;
  // Fade detail to the average colour where chips get smaller than a pixel (no moiré in the distance).
  float blur = clamp(max(fwidth(p2.x), fwidth(p2.y)) * 1.4, 0.0, 1.0);
  vec4 big = chips(p1, 0.55);
  vec4 small = chips(p2, 0.85);
  vec3 c = mix(binder, small.rgb, small.a * 0.9);
  c = mix(c, big.rgb, big.a);
  float blur1 = clamp(max(fwidth(p1.x), fwidth(p1.y)) * 0.9, 0.0, 1.0);
  c = mix(c, avg, max(blur * 0.8, blur1));
  return c;
}

// Window mask on the wall plane: 1 = glass, 0 = wall or frame. soft = edge softness in metres.
float windowMask(vec2 q, float soft) {
  vec2 a = smoothstep(WIN_MIN - soft, WIN_MIN + soft, q) * (1.0 - smoothstep(WIN_MAX - soft, WIN_MAX + soft, q));
  float inside = a.x * a.y;
  // Mullions: two vertical bars and one transom.
  float bar = 0.05 + soft;
  float m1 = smoothstep(bar, bar + soft + 0.001, abs(q.x + 0.45));
  float m2 = smoothstep(bar, bar + soft + 0.001, abs(q.x - 0.45));
  float t1 = smoothstep(bar, bar + soft + 0.001, abs(q.y - 1.85));
  return inside * m1 * m2 * t1;
}

vec3 sunDir(float t) {
  // Direction towards the sun (through the window). Slow drift: ~2 minutes per cycle.
  float az = 0.30 * sin(t * 0.052) + 0.08;
  float el = 0.50 + 0.05 * sin(t * 0.031 + 1.3);
  return normalize(vec3(sin(az), tan(el), -cos(az)));
}

vec3 wallColour(vec2 q, float soft) {
  vec3 wall = vec3(0.955, 0.945, 0.925);
  // Gentle bounce light on the wall around the window.
  float glow = exp(-0.35 * length(q - vec2(0.0, 1.6)));
  wall *= 0.86 + 0.14 * glow;
  float win = windowMask(q, soft);
  vec3 sky = vec3(1.32, 1.35, 1.40);
  // Window frame reads slightly darker than the wall.
  vec2 fa = smoothstep(WIN_MIN - 0.09, WIN_MIN - 0.06, q) * (1.0 - smoothstep(WIN_MAX + 0.06, WIN_MAX + 0.09, q));
  wall = mix(wall, wall * 0.82, fa.x * fa.y * (1.0 - win));
  return mix(wall, sky, win);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  // Camera: standing height, looking down the room towards the window.
  vec3 ro = vec3(0.45, 1.3, 3.0);
  vec3 ta = vec3(-0.25, mix(0.0, 0.12, uPortrait), -1.6);
  vec3 fw = normalize(ta - ro);
  vec3 rt = normalize(cross(fw, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(rt, fw);
  float zoom = mix(1.5, 1.62, uPortrait);
  vec3 rd = normalize(uv.x * rt + uv.y * up + zoom * fw);

  vec3 col;
  vec3 L = sunDir(uTime);
  vec3 sunCol = vec3(1.0, 0.93, 0.82);

  float tFloor = rd.y < 0.0 ? -ro.y / rd.y : 1e5;
  float tWall = rd.z < 0.0 ? (WALL_Z - ro.z) / rd.z : 1e5;

  if (tFloor < tWall) {
    vec3 p = ro + rd * tFloor;
    vec3 base = terrazzo(p.xz);

    // Sunlight through the window: trace from the floor point towards the sun to the wall plane.
    float s = (WALL_Z - p.z) / L.z;
    vec2 q = (p + L * s).xy;
    float penumbra = 0.015 + 0.012 * s;
    float lit = windowMask(q, penumbra);

    // Soft ambient that falls off away from the window.
    float amb = 0.78 + 0.14 * exp(-0.18 * abs(p.z - WALL_Z));
    vec3 diffuse = base * (amb + lit * 0.9 * sunCol);

    // Polished finish: mirror the view ray and look up what it sees on the wall.
    vec3 rr = vec3(rd.x, -rd.y, rd.z);
    float tr = rr.z < 0.0 ? (WALL_Z - p.z) / rr.z : 1e5;
    vec3 refl = vec3(0.9, 0.89, 0.87);
    if (tr < 1e4) {
      vec2 rq = (p + rr * tr).xy;
      // Rougher-looking reflections further away from the viewer.
      float soft = 0.03 + 0.02 * tr + 0.02 * tFloor;
      refl = wallColour(rq, soft);
      if (rq.y > 3.4) refl = vec3(0.9, 0.89, 0.87);
    }
    float cosT = clamp(-rd.y, 0.0, 1.0);
    float fres = 0.04 + 0.96 * pow(1.0 - cosT, 5.0);
    col = mix(diffuse, refl, clamp(fres * 0.85 + 0.03, 0.0, 0.9));

    // A soft glossy streak where the sunlit patch meets the viewer's reflection angle.
    vec3 h = normalize(L - rd);
    float spec = pow(clamp(h.y, 0.0, 1.0), 180.0) * lit;
    col += sunCol * spec * 0.35;
  } else if (tWall < 1e4) {
    vec3 p = ro + rd * tWall;
    col = wallColour(p.xy, 0.01);
    // Skirting board.
    col = mix(col * 0.8, col, smoothstep(0.1, 0.115, p.y));
  } else {
    col = vec3(0.9);
  }

  // Filmic-ish tone curve, a touch of warmth, gentle vignette.
  col = col / (1.0 + 0.18 * col);
  col = pow(col, vec3(0.94));
  float vig = 1.0 - 0.12 * dot(uv * vec2(0.8, 1.0), uv * vec2(0.8, 1.0));
  col *= vig;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;function I(s){let e=null;try{e=s.getContext("webgl",{antialias:!1,alpha:!1,depth:!1,powerPreference:"low-power",preserveDrawingBuffer:!1})}catch{e=null}if(!e||!e.getExtension("OES_standard_derivatives"))return null;const m=(t,v)=>{const r=e.createShader(t);return e.shaderSource(r,v),e.compileShader(r),e.getShaderParameter(r,e.COMPILE_STATUS)?r:null},i=m(e.VERTEX_SHADER,M),c=m(e.FRAGMENT_SHADER,`#extension GL_OES_standard_derivatives : enable
`+F);if(!i||!c)return null;const o=e.createProgram();if(e.attachShader(o,i),e.attachShader(o,c),e.linkProgram(o),!e.getProgramParameter(o,e.LINK_STATUS))return null;e.useProgram(o);const a=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,a),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),e.STATIC_DRAW);const f=e.getAttribLocation(o,"aPos");e.enableVertexAttribArray(f),e.vertexAttribPointer(f,2,e.FLOAT,!1,0,0);const h=e.getUniformLocation(o,"uRes"),n=e.getUniformLocation(o,"uTime"),d=e.getUniformLocation(o,"uPortrait");return{resize(t,v,r){const u=Math.max(1,Math.round(t*r)),p=Math.max(1,Math.round(v*r));(s.width!==u||s.height!==p)&&(s.width=u,s.height=p),e.viewport(0,0,u,p),e.uniform2f(h,u,p),e.uniform1f(d,v>t?1:0)},draw(t){e.uniform1f(n,t),e.drawArrays(e.TRIANGLES,0,3)},dispose(){e.deleteBuffer(a),e.deleteProgram(o),e.deleteShader(i),e.deleteShader(c)}}}const b=18;function W(){const s=g.useRef(null),e=g.useRef(null),[m,i]=g.useState("loading");return g.useEffect(()=>{window.__floorState=m},[m]),g.useEffect(()=>{const c=e.current,o=s.current;if(!c||!o)return;const a=I(c);if(!a){i("fallback");return}const f=window.matchMedia("(prefers-reduced-motion: reduce)");let h=!0,n=0,d=performance.now(),t=0,v=0,r=!1;const u=()=>{const l=o.getBoundingClientRect(),S=window.__FLOOR_DPR??Math.min(window.devicePixelRatio||1,1.5);a.resize(l.width,l.height,S)},p=l=>{n=0,!r&&(l-v>=32&&(a.draw(b+(l-d)/1e3),v=l),x())},x=()=>{!n&&h&&!document.hidden&&!f.matches&&!r&&(n=requestAnimationFrame(p))},w=()=>{n&&cancelAnimationFrame(n),n=0},y=()=>{u(),f.matches?(w(),a.draw(b),i("static")):(a.draw(b+(performance.now()-d)/1e3),i("animating"),x())},z=()=>{document.hidden?(t=performance.now(),w()):(t&&(d+=performance.now()-t),t=0,x())},A=new IntersectionObserver(([l])=>{h=l.isIntersecting,h?(t&&(d+=performance.now()-t),t=0,x()):(t=performance.now(),w())});A.observe(o);const L=new ResizeObserver(()=>{u(),n||a.draw(b+((t||performance.now())-d)/1e3)});L.observe(o);const R=l=>{l.preventDefault(),r=!0,w(),i("fallback")};return c.addEventListener("webglcontextlost",R),f.addEventListener("change",y),document.addEventListener("visibilitychange",z),y(),()=>{w(),A.disconnect(),L.disconnect(),c.removeEventListener("webglcontextlost",R),f.removeEventListener("change",y),document.removeEventListener("visibilitychange",z),a.dispose()}},[]),_.jsxs("div",{ref:s,className:"floor","data-floor-state":m,children:[_.jsx(E,{}),_.jsx("canvas",{ref:e,className:"floor__canvas","aria-hidden":"true"})]})}export{b as STILL_TIME,W as default};
