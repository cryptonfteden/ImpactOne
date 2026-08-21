(() => {
  const canvas = document.getElementById("earth-webgl");
  if (!canvas) return;

  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
  });

  if (!gl) {
    canvas.classList.add("earth-webgl--fallback");
    return;
  }

  const vertexSource = `
    attribute vec2 position;
    varying vec2 screenUv;
    void main() {
      screenUv = position * 0.5 + 0.5;
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;

  const fragmentSource = `
    precision highp float;
    uniform vec2 resolution;
    uniform float time;
    uniform sampler2D earthMap;
    varying vec2 screenUv;

    void main() {
      // Preserve the original cinematic horizon exactly. Only the virtual
      // camera moves in a shallow orbital arc around that established angle.
      float orbit = time * 0.035;
      float zoom = 1.055 + cos(orbit) * 0.006;
      vec2 centred = screenUv - 0.5;
      centred.x *= 1.0 + centred.y * sin(orbit) * 0.018;
      centred.y *= 1.0 + cos(orbit) * 0.006;
      vec2 cameraOffset = vec2(sin(orbit) * 0.028, cos(orbit) * 0.009);
      vec2 earthUv = centred / zoom + 0.5 + cameraOffset;

      // Stars sit farther away than Earth, creating subtle depth without
      // changing the original globe angle or warping its horizon.
      vec2 starUv = centred / (zoom + 0.012) + 0.5 + cameraOffset * 0.42;
      vec3 earthLayer = texture2D(earthMap, clamp(earthUv, 0.001, 0.999)).rgb;
      vec3 distantLayer = texture2D(earthMap, clamp(starUv, 0.001, 0.999)).rgb;
      float distantSpace = smoothstep(0.52, 0.88, screenUv.y);
      vec3 colour = mix(earthLayer, distantLayer, distantSpace * 0.18);

      float vignette = 1.0 - smoothstep(0.58, 1.03, length((screenUv - 0.5) * vec2(1.05, 0.82)));
      colour *= 0.90 + vignette * 0.10;
      colour += vec3(0.015, 0.045, 0.09) * (1.0 - vignette);
      gl_FragColor = vec4(colour, 1.0);
    }
  `;

  const compile = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(message || "Unable to compile Earth shader");
    }
    return shader;
  };

  let program;
  try {
    program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) || "Unable to link Earth shader");
    }
  } catch (error) {
    console.warn("ImpactOne Earth scene fallback:", error);
    canvas.classList.add("earth-webgl--fallback");
    return;
  }

  const vertices = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertices);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  gl.useProgram(program);

  const position = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const resolution = gl.getUniformLocation(program, "resolution");
  const sceneTime = gl.getUniformLocation(program, "time");
  const earthMap = gl.getUniformLocation(program, "earthMap");
  const texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([4, 18, 42, 255]));
  // The supplied 1774x887 map is NPOT. WebGL 1 requires clamp + linear
  // filtering for NPOT textures; repeat/mipmaps make the sampler incomplete.
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.uniform1i(earthMap, 0);

  const image = new Image();
  image.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    canvas.classList.add("earth-webgl--ready");
  };
  image.onerror = () => canvas.classList.add("earth-webgl--fallback");
  image.src = "/assets/earth-network.png";

  let startTime = performance.now();
  let animationFrame = 0;
  let visible = true;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

  const resize = () => {
    const bounds = canvas.getBoundingClientRect();
    const density = Math.min(devicePixelRatio || 1, 1.65);
    const width = Math.max(1, Math.round(bounds.width * density));
    const height = Math.max(1, Math.round(bounds.height * density));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
  };

  const render = (now) => {
    resize();
    gl.useProgram(program);
    gl.uniform2f(resolution, canvas.width, canvas.height);
    gl.uniform1f(sceneTime, reducedMotion.matches ? 0 : (now - startTime) / 1000);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    if (visible) animationFrame = requestAnimationFrame(render);
  };

  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    cancelAnimationFrame(animationFrame);
    if (visible) {
      startTime += performance.now() - (canvas.dataset.pausedAt || performance.now());
      animationFrame = requestAnimationFrame(render);
    } else {
      canvas.dataset.pausedAt = String(performance.now());
    }
  }, { rootMargin: "120px" });

  observer.observe(canvas);
  animationFrame = requestAnimationFrame(render);
})();
