/**
 * Silk is one opaque screen-filling shader, not a 3D scene. Keep its WebGL2
 * resources local instead of constructing a scene graph, camera and material
 * renderer. The shader's display-RGB output and NoColorSpace image upload are
 * deliberately identical to its previous Three ShaderMaterial implementation.
 */
export class SilkVector2 {
  constructor(public x = 0, public y = 0) {}
  set(x: number, y: number) { this.x = x; this.y = y; return this; }
  copy(other: SilkVector2) { return this.set(other.x, other.y); }
  multiplyScalar(value: number) { return this.set(this.x * value, this.y * value); }
  equals(other: SilkVector2) { return this.x === other.x && this.y === other.y; }
  lerp(other: SilkVector2, alpha: number) {
    return this.set(this.x + (other.x - this.x) * alpha, this.y + (other.y - this.y) * alpha);
  }
  distanceToSquared(other: SilkVector2) { return (this.x - other.x) ** 2 + (this.y - other.y) ** 2; }
}

export class SilkVector4 {
  constructor(public x: number, public y: number, public z: number, public w: number) {}
  set(x: number, y: number, z: number, w: number) {
    this.x = x; this.y = y; this.z = z; this.w = w; return this;
  }
}

type UniformValue = number | [number, number, number] | SilkVector2 | SilkVector4 | HTMLImageElement | null;
export type SilkUniforms = Record<string, { value: UniformValue }>;

const VERTEX_SHADER = `#version 300 es
precision highp float;
in vec2 position;
out vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}`;

export function createSilkRenderer(
  canvas: HTMLCanvasElement,
  fragmentShader: string,
  interiorScene: boolean,
) {
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    // Multisampling adds no edge coverage to this screen-filling quad.
    // Paired hardware/software pixel checks preserve the same shader output.
    antialias: false,
    powerPreference: "high-performance",
    preserveDrawingBuffer: process.env.NODE_ENV !== "production",
  });
  if (!gl) throw new Error("Silk WebGL2 is unavailable");
  gl.drawingBufferColorSpace = "srgb";

  let disposed = false;
  let generation = 0;
  let program: WebGLProgram | null = null;
  let positions: WebGLBuffer | null = null;
  let vertexArray: WebGLVertexArrayObject | null = null;
  let texture: WebGLTexture | null = null;
  let uploadedImage: HTMLImageElement | null = null;
  let uploadedSource = "";
  let uniformEntries: Array<[string, { value: UniformValue }]> | null = null;
  const locations = new Map<string, WebGLUniformLocation | null>();

  const releaseResources = () => {
    gl.deleteProgram(program);
    gl.deleteBuffer(positions);
    gl.deleteVertexArray(vertexArray);
    gl.deleteTexture(texture);
    program = null;
    positions = null;
    vertexArray = null;
    texture = null;
    uploadedImage = null;
    uploadedSource = "";
    locations.clear();
  };

  const compile = async () => {
    const currentGeneration = ++generation;
    releaseResources();
    const vertex = gl.createShader(gl.VERTEX_SHADER);
    const fragment = gl.createShader(gl.FRAGMENT_SHADER);
    program = gl.createProgram();
    if (!vertex || !fragment || !program) throw new Error("Silk shader allocation failed");
    gl.shaderSource(vertex, VERTEX_SHADER);
    gl.shaderSource(fragment, `#version 300 es
precision highp float;
precision highp int;
#define varying in
#define texture2D texture
out vec4 silkFragmentColor;
#define gl_FragColor silkFragmentColor
${interiorScene ? "#define HERO_INTERIOR_SCENE 1" : ""}
${fragmentShader}`);
    gl.compileShader(vertex);
    gl.compileShader(fragment);
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    // Attached shader objects can be marked for deletion immediately; the
    // linked program retains them. No resources survive a failed compile.
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    const extension = gl.getExtension("KHR_parallel_shader_compile");
    if (extension) {
      while (!gl.getProgramParameter(program, extension.COMPLETION_STATUS_KHR)) {
        await new Promise<void>((resolve) => setTimeout(resolve, 16));
        if (disposed || currentGeneration !== generation || gl.isContextLost()) return;
      }
    }
    if (disposed || currentGeneration !== generation || gl.isContextLost()) return;
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const message = gl.getProgramInfoLog(program) || "Silk shader link failed";
      releaseResources();
      throw new Error(message);
    }
    positions = gl.createBuffer();
    vertexArray = gl.createVertexArray();
    texture = gl.createTexture();
    if (!positions || !vertexArray || !texture) {
      releaseResources();
      throw new Error("Silk geometry allocation failed");
    }
    gl.bindVertexArray(vertexArray);
    gl.bindBuffer(gl.ARRAY_BUFFER, positions);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.disable(gl.CULL_FACE);
  };

  const resize = (width: number, height: number, pixelRatio: number) => {
    const nextWidth = Math.floor(width * pixelRatio);
    const nextHeight = Math.floor(height * pixelRatio);
    // ResizeObserver, image decode and reveal completion can all measure the
    // same box. Assigning either canvas dimension would clear/reallocate it.
    if (canvas.width !== nextWidth) canvas.width = nextWidth;
    if (canvas.height !== nextHeight) canvas.height = nextHeight;
    // Three setSize floors the backing store but its default setViewport
    // rounds CSS size × DPR. Preserve that subpixel sampling at fractional
    // desktop raster scales, including the room photograph's sharp edges.
    gl.viewport(0, 0, Math.round(width * pixelRatio), Math.round(height * pixelRatio));
  };

  const render = (uniforms: SilkUniforms) => {
    if (disposed || !program || gl.isContextLost()) return;
    gl.useProgram(program);
    gl.bindVertexArray(vertexArray);
    uniformEntries ??= Object.entries(uniforms);
    for (const [name, uniform] of uniformEntries) {
      if (!locations.has(name)) locations.set(name, gl.getUniformLocation(program, name));
      const location = locations.get(name);
      if (!location) continue;
      const value = uniform.value;
      if (name === "uInterior") {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        if (value instanceof HTMLImageElement
          && (value !== uploadedImage || value.currentSrc !== uploadedSource)) {
          // Match Three Texture(NoColorSpace): encoded RGB bytes, no implicit
          // browser transfer conversion, Y-flipped, unpremultiplied RGBA.
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
          gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
          gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
          gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, value);
          uploadedImage = value;
          uploadedSource = value.currentSrc;
        }
        gl.uniform1i(location, 0);
      } else if (typeof value === "number") {
        gl.uniform1f(location, value);
      } else if (value instanceof SilkVector4) {
        gl.uniform4f(location, value.x, value.y, value.z, value.w);
      } else if (value instanceof SilkVector2) {
        gl.uniform2f(location, value.x, value.y);
      } else if (Array.isArray(value)) {
        gl.uniform3f(location, value[0], value[1], value[2]);
      }
    }
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  return {
    compile,
    resize,
    render,
    dispose() {
      disposed = true;
      generation += 1;
      releaseResources();
    },
  };
}
