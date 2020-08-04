
var count = 0;
var firstDraw = true;
var mousePx = 0;
var mousePy = 0;
var clickPx = 0;
var clickPy = 0;
var nCellsX = 256;
var nCellsY = 128;
var runKeyPressed = false;
var lastUpdatedTexture = 0;
var editClick = false;
var curserRadius = 80;
var wavelength = 60;



main();

//
// Start here
//
function main() 
{

  // Gain access to html canvas and context
  const canvas = document.querySelector('#glcanvas');
  const gl = canvas.getContext('webgl2');
  var ext = gl.getExtension('EXT_color_buffer_float');
  var ext1 = gl.getExtension('OES_texture_float_linear');

  // Check if gl context is valid
  if (!gl) { alert('No gl context'); return;}

  canvas.addEventListener("mousemove", function(e) { 
    var cRect = canvas.getBoundingClientRect();        // Gets CSS pos, and width/height
    var canvasX = Math.round(e.clientX - cRect.left);  // Subtract the 'left' of the canvas 
    var canvasY = Math.round(e.clientY - cRect.top);
    editClick = true;
    mousePx = (canvasX/canvas.width) ;
    mousePy = (canvasY/canvas.height);
    clickPx = mousePx;
    clickPy = mousePy;
    document.getElementById("s0").innerText = "(x,y) = "+mousePx+", "+mousePy;
  });



  
  document.addEventListener("keydown", function(e) { 
    editClick = true;
    //alert(e.keyCode);
    if (e.keyCode == 32) // space
      runKeyPressed = !runKeyPressed;
    if (e.keyCode == 40) //down // left arrow key = 39
    {
      if (curserRadius > 10)
      {
        curserRadius += 5;
      }
      else
      {
        if (curserRadius > 1)
          curserRadius +=1;
        else
        {
          curserRadius += 0.1;
        }

      }
      
        
        if (curserRadius > 200)
          curserRadius = 200;
    }
  
    if(e.keyCode == 38) //up  // right arrow key = 37
    {
      if (curserRadius > 10)
      {
        curserRadius -= 5;
      }
      else
      {
        if (curserRadius > 1)
          curserRadius -=1;
        else
        {
          curserRadius -= 0.1;
        }

      }
      
      if (curserRadius < 0) // if = 0
        curserRadius = 0.1;
    }

    if (e.keyCode == 37) //left
    {
        wavelength -= 10;
        if (wavelength < 10)
        wavelength  = 10;
    }
  
    if(e.keyCode == 39) //right
    {
      wavelength += 10;
      if (wavelength > 100)
      wavelength  = 100;
    }

      

    
    //alert(e.keyCode);
  });


  

  // Vertex shader source code
  const vsSource = `#version 300 es
    in vec4 aVertexPosition;
    in vec2 aTextureCoord;
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    uniform float uflipY;

    out highp vec2 vTextureCoord;

    void main(void) {
      vec4 temp = uProjectionMatrix * uModelViewMatrix * aVertexPosition ;
      gl_Position = temp*vec4(1, uflipY,1,1);
      vTextureCoord = aTextureCoord;
    }
  `;

  // Canvas Fragment shader source code
  const fragShader_Render = `#version 300 es
    precision highp float;
    uniform sampler2D uSampler;
    in highp vec2 vTextureCoord;

    out vec4 fragColor;

    void main(void) 
    {
   
      vec4 f = texture(uSampler, vTextureCoord);
      fragColor = vec4(abs(f.x), abs(f.y), f.z, 0.0);
    } `;


    const fragShader_Edit = `#version 300 es
      precision highp float;
      uniform sampler2D uSampler;
      uniform vec2 uMouseClickPos;
      uniform float r;
      uniform float w;
      in highp vec2 vTextureCoord;

      out vec4 fragColor;
      void main(void) 
      {
        vec4 p = texture(uSampler, vTextureCoord);
      
        
        //vec2 dr = vTextureCoord - uMouseClickPos;

        //float dr2 = dr.x*dr.x + dr.y*dr.y;

        float d = distance(vTextureCoord , uMouseClickPos);
        float dr = w*d;

 
         
        float e_r = exp(-r*d);

        //vec4 add = vec4(e_r*cos(dr), -e_r*cos(dr), e_r*sin(dr), 0);

        vec4 add = vec4(0,0, 50.0*e_r*sin(dr), 0);

        fragColor = add + p;

      } `;

    const fragShader_Magnetic = `#version 300 es
    precision highp float;

    uniform sampler2D uSampler;
    uniform vec2 uTextureSize;
    uniform float c[6];

    in highp vec2 vTextureCoord;

    out vec4 fragColor;
    void main(void) 
    {
      float Hx_c = texture(uSampler, vTextureCoord).r;
      float Hy_c = texture(uSampler, vTextureCoord).g;
      float Ez_c = texture(uSampler, vTextureCoord).b;
      float Ez_u = texture(uSampler, vTextureCoord + vec2( 0.0, -uTextureSize.y)).b;
      float Ez_r = texture(uSampler, vTextureCoord + vec2( uTextureSize.x,  0.0)).b;
      
      float Hx_out = c[0]*Hx_c - c[1]*(Ez_u - Ez_c);
      float Hy_out = c[2]*Hy_c + c[3]*(Ez_r - Ez_c);

      fragColor = vec4(Hx_out, Hy_out, Ez_c, 0.0);
    } `;


    const fragShader_Electric = `#version 300 es
    precision highp float;

    uniform sampler2D uSampler;
    uniform vec2 uTextureSize;
    uniform float c[6];

    in highp vec2 vTextureCoord;

    out vec4 fragColor;
    void main(void) 
    {
      float Hx_c = texture(uSampler, vTextureCoord).r;
      float Hy_c = texture(uSampler, vTextureCoord).g;
      float Ez_c = texture(uSampler, vTextureCoord).b;

      float Hx_d = texture(uSampler, vTextureCoord + vec2( 0.0, uTextureSize.y)).r;
      float Hy_l = texture(uSampler, vTextureCoord + vec2( -uTextureSize.x,  0.0)).g;
      
      float Ez_out = c[4]*Ez_c + c[5]*((Hy_c - Hy_l) - (Hx_c - Hx_d));
 

      fragColor = vec4(Hx_c, Hy_c, Ez_out, 0.0);
    } `;

  // Initialize shader programs
  const program_Render = initShaderProgram(gl, vsSource, fragShader_Render);
  const program_Edit = initShaderProgram(gl, vsSource, fragShader_Edit);
  const program_Magnetic = initShaderProgram(gl, vsSource, fragShader_Magnetic);
  const program_Electric = initShaderProgram(gl, vsSource, fragShader_Electric);

  // Bundle shader program information.
  const programInfo_Render = {
     program: program_Render,
    attribLocations: {
      vertexPosition: gl.getAttribLocation(program_Render, 'aVertexPosition'),
      textureCoord: gl.getAttribLocation(program_Render, 'aTextureCoord'),
    },
    uniformLocations: {
      projectionMatrix: gl.getUniformLocation(program_Render, 'uProjectionMatrix'),
      modelViewMatrix: gl.getUniformLocation(program_Render, 'uModelViewMatrix'),
      uflipY: gl.getUniformLocation(program_Render,'uflipY'),
      uSampler: gl.getUniformLocation(program_Render, 'uSampler'),
      
      
    },
  };

  const programInfo_Edit = {
    program: program_Edit,
   attribLocations: {
     vertexPosition: gl.getAttribLocation(program_Edit, 'aVertexPosition'),
     textureCoord: gl.getAttribLocation(program_Edit, 'aTextureCoord'),
   },
   uniformLocations: {
     projectionMatrix: gl.getUniformLocation(program_Edit, 'uProjectionMatrix'),
     modelViewMatrix: gl.getUniformLocation(program_Edit, 'uModelViewMatrix'),
     uflipY: gl.getUniformLocation(program_Edit,'uflipY'),
     uSampler: gl.getUniformLocation(program_Edit, 'uSampler'),
     uMouseClickPos: gl.getUniformLocation(program_Edit, 'uMouseClickPos'),
     r: gl.getUniformLocation(program_Edit, 'r'),
     w: gl.getUniformLocation(program_Edit, 'w'),
     
   },
 };

 
 const programInfo_Magnetic = {
  program: program_Magnetic,
 attribLocations: {
   vertexPosition: gl.getAttribLocation(program_Magnetic, 'aVertexPosition'),
   textureCoord: gl.getAttribLocation(program_Magnetic, 'aTextureCoord'),
 },
 uniformLocations: {
   projectionMatrix: gl.getUniformLocation(program_Magnetic, 'uProjectionMatrix'),
   modelViewMatrix: gl.getUniformLocation(program_Magnetic, 'uModelViewMatrix'),
   uflipY: gl.getUniformLocation(program_Magnetic,'uflipY'),
   uSampler: gl.getUniformLocation(program_Magnetic, 'uSampler'),
   uTextureSize: gl.getUniformLocation(program_Magnetic, 'uTextureSize'),
   c: gl.getUniformLocation(program_Magnetic, 'c'),
 },
};

const programInfo_Electric = {
  program: program_Electric,
 attribLocations: {
   vertexPosition: gl.getAttribLocation(program_Electric, 'aVertexPosition'),
   textureCoord: gl.getAttribLocation(program_Electric, 'aTextureCoord'),
 },
 uniformLocations: {
   projectionMatrix: gl.getUniformLocation(program_Electric, 'uProjectionMatrix'),
   modelViewMatrix: gl.getUniformLocation(program_Electric, 'uModelViewMatrix'),
   uflipY: gl.getUniformLocation(program_Electric,'uflipY'),
   uSampler: gl.getUniformLocation(program_Electric, 'uSampler'),
   uTextureSize: gl.getUniformLocation(program_Electric, 'uTextureSize'),
   c: gl.getUniformLocation(program_Electric, 'c'),
 },
};

  // Makee rectangle for displaying stuff
  const buffers = initBuffers(gl);
  // Set Up Textures
  var tex1 = createAndSetupTexture(gl);
  initializeTextureRGBA32F(gl, tex1, null);
  var fbo1 = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo1);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex1, 0);

  var tex2 = createAndSetupTexture(gl);
  initializeTextureRGBA32F(gl, tex2, null);
  var fbo2 = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo2);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex2, 0);


  var pixels = new Float32Array(nCellsX*nCellsY*4);
  var c = 0.99;
  var c2 = 0.2;
  constants = [c,c2,c, c2, c, c2];

  var textures =[tex1, tex2];
  var framebuffers = [fbo1, fbo2];
  var lastupdate = 0;


   var then = 0;
 
   function update(now) {
     now *= 0.001;  // convert to seconds
     const deltaTime = now - then;
     then = now;

     if (editClick)
     {
      edit(gl, programInfo_Edit, buffers, textures[lastupdate], framebuffers[(lastupdate + 1)%2]);
      lastupdate = (lastupdate + 1) % 2;
       editClick = false;
     }

     run(gl, programInfo_Magnetic, buffers, textures[lastupdate], framebuffers[(lastupdate + 1)%2], constants) ;
     lastupdate = (lastupdate + 1) % 2;
  

    run(gl, programInfo_Electric, buffers,textures[lastupdate], framebuffers[(lastupdate + 1)%2], constants) ;
    lastupdate = (lastupdate + 1) % 2;

     render(gl, programInfo_Render,buffers, textures[lastupdate]);

     requestAnimationFrame(update);
   }
   requestAnimationFrame(update);
    
 
 
}





function render(gl, programInfo, buffers, renderTex) {
  //clean up frame
  setFramebuffer(gl, null, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
  gl.clearDepth(1.0);                 // Clear everything
  gl.enable(gl.DEPTH_TEST);           // Enable depth testing
  gl.depthFunc(gl.LEQUAL);            // Near things obscure far things
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Create a perspective matrix
  const fieldOfView = 45 * Math.PI / 180;   // in radians
  const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
  const zNear = 1.0;
  const zFar = 100.0;
  const projectionMatrix = mat4.create();


  // Set the drawing position to identity point
  const modelViewMatrix = mat4.create();

  // move the drawing position
  mat4.translate(modelViewMatrix,     // destination matrix
                 modelViewMatrix,     // matrix to translate
                 [0.0, 0.0, 0.0]);  // amount to translate

  // Tell WebGL how to pull out vertex data
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
  gl.vertexAttribPointer(
      programInfo.attribLocations.vertexPosition,
      3, //number of components
      gl.FLOAT, //data type
      false, //normalize - don't
      0, //stride
      0); // offset
  gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
  


  // Tell WebGL how to pull texcoords
  
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.textureCoord);
  gl.vertexAttribPointer(
      programInfo.attribLocations.textureCoord,
      2, //numComponents,
      gl.FLOAT, //type,
      false, //normalize,
      0, //stride,
      0); //offset);
  gl.enableVertexAttribArray(programInfo.attribLocations.textureCoord);
  

  // Tell WebGL which indices to use to index the vertices
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);

  // Tell WebGL to use our program when drawing
  gl.useProgram(programInfo.program);

  // Set the shader uniforms
  gl.uniformMatrix4fv(
      programInfo.uniformLocations.projectionMatrix,
      false,
      projectionMatrix);
  gl.uniformMatrix4fv(
      programInfo.uniformLocations.modelViewMatrix,
      false,
      modelViewMatrix);

  
  // Specify the texture to map onto the faces.
  // Tell WebGL we want to affect texture unit 0
 

  

  // Tell the shader we bound the texture to texture unit 0
  gl.uniform1i(programInfo.uniformLocations.uSampler, 0);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, renderTex); 

 gl.uniform1f(programInfo.uniformLocations.uflipY, 1);


   // draw to canvas
   setFramebuffer(gl, null, gl.canvas.width, gl.canvas.height);
   gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  
}



function edit(gl, programInfo, buffers, tex, fbo) 
{

  setupContext(gl,programInfo,buffers);
  // Set Uniforms
  gl.uniform1i(programInfo.uniformLocations.uSampler, 0);
  gl.uniform2f(programInfo.uniformLocations.uMouseClickPos, clickPx, clickPy);
  gl.uniform1f(programInfo.uniformLocations.r, curserRadius);
  gl.uniform1f(programInfo.uniformLocations.w, wavelength);
  
  // Bind Dirt Texture
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex); 

   
  // Setup to draw into one of the framebuffers.
   gl.uniform1f(programInfo.uniformLocations.uflipY, -1);
  setFramebuffer(gl, fbo, nCellsX, nCellsY);

  // do drawing to frame buffer just set
  gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
}


function run(gl, programInfo, buffers, tex, fbo, constants) 
{

  setupContext(gl,programInfo,buffers);
  // Set Uniforms
  gl.uniform1i(programInfo.uniformLocations.uSampler, 0);
  gl.uniform2f(programInfo.uniformLocations.uTextureSize, 1/nCellsX, 1/nCellsY);
  gl.uniform1fv(programInfo.uniformLocations.c, constants);
  
  // Bind Dirt Texture
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex); 

   
  // Setup to draw into one of the framebuffers.
   gl.uniform1f(programInfo.uniformLocations.uflipY, -1);
  setFramebuffer(gl, fbo, nCellsX, nCellsY);

  // do drawing to frame buffer just set
  gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
}




function setupContext(gl, programInfo, buffers)
{
  const projectionMatrix = mat4.create();

  // Set the drawing position to identity point
  const modelViewMatrix = mat4.create();

  // move the drawing position
  mat4.translate(modelViewMatrix,     // destination matrix
                 modelViewMatrix,     // matrix to translate
                 [0.0, 0.0, 0.0]);  // amount to translate

  // Tell WebGL how to pull out vertex data
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
  gl.vertexAttribPointer(
      programInfo.attribLocations.vertexPosition,
      3, //number of components
      gl.FLOAT, //data type
      false, //normalize - don't
      0, //stride
      0); // offset
  gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
  


  // Tell WebGL how to pull texcoords
  
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.textureCoord);
  gl.vertexAttribPointer(
      programInfo.attribLocations.textureCoord,
      2, //numComponents,
      gl.FLOAT, //type,
      false, //normalize,
      0, //stride,
      0); //offset);
  gl.enableVertexAttribArray(programInfo.attribLocations.textureCoord);
  

  // Tell WebGL which indices to use to index the vertices
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);

  // Tell WebGL to use our program when drawing
  gl.useProgram(programInfo.program);

  // Set the shader uniforms
  gl.uniformMatrix4fv(
      programInfo.uniformLocations.projectionMatrix,
      false,
      projectionMatrix);
  gl.uniformMatrix4fv(
      programInfo.uniformLocations.modelViewMatrix,
      false,
      modelViewMatrix);

}


function setFramebuffer(gl, fbo, width, height) 
{
  // make this the framebuffer we are rendering to.
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);

  // Tell the shader the resolution of the framebuffer.
 // gl.uniform2f(resolutionLocation, width, height);

  // Tell WebGL how to convert from clip space to pixels
  gl.viewport(0, 0, width, height);
}

// initBuffers
function initBuffers(gl) {

  // Create a buffer for the cube's vertex positions.
  const positionBuffer = gl.createBuffer();

  // Select the positionBuffer
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  // Create rectangle for displaying textures
  const positions = [
    -1.0, -1.0,  0.0,
     1.0, -1.0,  0.0,
     1.0,  1.0,  0.0,
    -1.0,  1.0,  0.0,

  ];

  // Pass positions to vertex buffer
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  // Set up texture coordinates buffer for vertices
  const textureCoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);
 // create texcoord data
  const textureCoordinates = [
    // Front
    0.0,  1.0,
    1.0,  1.0,
    1.0,  0.0,
    0.0,  0.0,
  ];

  // Pass texcoord data to textureCoordbuffer
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates),
                gl.STATIC_DRAW);

  // Setup Index Buffer
  const indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

  // Create index data
  const indices = [
    0,  1,  2,      0,  2,  3,    // front
  ];

  // Pass index data to index buffer
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(indices), gl.STATIC_DRAW);

  return {
    position: positionBuffer,
    textureCoord: textureCoordBuffer,
    indices: indexBuffer,
  };
}



function createAndSetupTexture(gl)
{
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  return texture;
}





function initializeTextureRGBA32F(gl, texture, data)
{ const level = 0;
  const internalFormat = gl.RGBA32F;
  const width = nCellsX;
  const height = nCellsY;
  const border = 0;
  const srcFormat = gl.RGBA;
  const srcType = gl.FLOAT;
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                width, height, border, srcFormat, srcType,
                data);
}




// Initialize a shader program, so WebGL knows how to draw our data
function initShaderProgram(gl, vsSource, fsSource) {
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

  // Create the shader program

  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  // If creating the shader program failed, alert

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
    return null;
  }

  return shaderProgram;
}


// creates shader, uploads source, and compile
function loadShader(gl, type, source) {
  const shader = gl.createShader(type);

  // Send the source to the shader object

  gl.shaderSource(shader, source);

  // Compile the shader program

  gl.compileShader(shader);

  // See if it compiled successfully

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}


