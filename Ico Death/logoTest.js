//Get canvas and webgl context
var canvas = document.getElementsByTagName('canvas')[0];
canvas.style.width = '100%';
canvas.style.height = '100%';
var gl = canvas.getContext('webgl');

//global variables
var loopDraw = false;

//display plane
var displayProgram;
var logoDims = [400, 400];
var backgroundColor = [0, 0, 0, 1];
var displayVB;
var displayTC;
var displayIB;
var displayPosLoc;
var displayTexLoc;
var displayTexCoordLoc;

//offscreen icosahedron
var icosahedronProgram;
var icosahedronDrawCount;
var frameBuffer;
var depthBuffer;
var renderTexture;
var vertexBuffer;
var colorBuffer;
var indexBuffer;
var positionLoc;
var colorLoc;
var resolution = 2000;

//try to init webgl
gl ? initWebGL() : initBackup();

function initBackup() {
    //use something simpler
    alert('Webgl not supported!');
}

function initWebGL() {
    initFrameBuffer();
    initMainDisplayProgram();
    initIcosahedronProgram();

    //draw
    draw();
}

function draw() {
    drawIcosahedron();

    drawMainDisplay();
    
    //loop
    if(loopDraw) requestAnimationFrame(draw);
}

function checkShaderError(shader) {
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
    }
}

function checkProgramError(program) {
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program));
    }
}

function initFrameBuffer() {
    //init render texture
    var level = 0;
    renderTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, renderTexture);
    gl.texImage2D(gl.TEXTURE_2D, level, gl.RGBA, resolution, resolution, 0, gl.RGBA, gl.UNSIGNED_BYTE, 
        new Uint8Array([0, 0, 255, 255]));//filled with a 1x1 blue pixel

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    //init framebuffer
    frameBuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);

    //bind render texture
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, renderTexture, level);

    //init and bind depth buffer
    depthBuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, resolution, resolution);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);
}

function initMainDisplayProgram() {
    //flat rectangle data
    var logoPos = [
        (logoDims[0] / canvas.width) / 2,
        (logoDims[1] / canvas.height) / 2
    ];
    var vertexData = [
        //0.5-logoPos[0], 0.5-logoPos[1], 0,//bottom left
        //0.5-logoPos[0], 0.5+logoPos[1], 0,//top left
        //0.5+logoPos[0], 0.5-logoPos[1], 0,//bottom right
        //0.5+logoPos[0], 0.5+logoPos[1], 0//top right
        -1, -1, 0, //bottom left
        -1, 1, 0,  //top left
        1, -1, 0,  //bottom right
        1, 1, 0    //top right
    ];
    var textureData = [
        0, 0,
        0, 1,
        1, 0,
        1, 1,
        1, 0,
        0, 1
    ];
    var indicesData = [
        0, 1, 2,
        3, 2, 1
    ]

    //create and populate buffers
    displayVB = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, displayVB);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexData), gl.STATIC_DRAW);

    displayTC = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, displayTC);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureData), gl.STATIC_DRAW);

    displayIB = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, displayIB);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indicesData), gl.STATIC_DRAW);
    
    //create shaders
    var vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, displayVertexShaderSource);
    gl.compileShader(vertexShader);

    var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, displayFragmentShaderSource);
    gl.compileShader(fragmentShader);

    //check for shader errors
    checkShaderError(vertexShader);
    checkShaderError(fragmentShader);

    //create program and attach/link shaders
    displayProgram = gl.createProgram();
    gl.attachShader(displayProgram, vertexShader);
    gl.attachShader(displayProgram, fragmentShader);
    gl.linkProgram(displayProgram);

    //check for program errors
    checkProgramError(displayProgram);

    //enable attributes
    gl.bindBuffer(gl.ARRAY_BUFFER, displayVB);
    displayPosLoc = gl.getAttribLocation(displayProgram, 'position');
    gl.vertexAttribPointer(displayPosLoc, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, displayTC);
    displayTexCoordLoc = gl.getAttribLocation(displayProgram, 'texcoord');
    gl.vertexAttribPointer(displayTexCoordLoc, 2, gl.FLOAT, false, 0, 0);

    displayTexLoc = gl.getUniformLocation(displayProgram, 'uTexture');
}

function initIcosahedronProgram() {
    //icosahedron, 3 rectangles with the golden ratio
    let width = 1;
    let length = (1 + Math.sqrt(5))/2;

    let hw = width / 2;
    let hl = length / 2;

    let rectX = [//red
        [hl, 0, hw],
        [hl, 0, -hw],
        [-hl, 0, hw],
        [-hl, 0, -hw]
    ];

    let rectY = [//blue
        [hw, hl, 0],
        [hw, -hl, 0],
        [-hw, hl, 0],
        [-hw, -hl, 0]
    ];

    let rectZ = [//yellow
        [0, hw, hl],
        [0, hw, -hl],
        [0, -hw, hl],
        [0, -hw, -hl]
    ];

    let icosahedronVerts = [];

    rectX.forEach(rect => {
        icosahedronVerts.push(rect);
    });

    rectY.forEach(rect => {
        icosahedronVerts.push(rect);
    });

    rectZ.forEach(rect => {
        icosahedronVerts.push(rect);
    });

    let icosahedronTris = [
        [],// Y[2], Z[0],Y[0]
        [],//
        [],//
        [],//
        [],//
        [],//
        [],//
        [],//
        [],//
        [],//
        [],//
        [] //
    ];

    var vertexData = [];
    rectY[2].forEach(point => {
        vertexData.push(point);
    });
    rectZ[1].forEach(point => {
        vertexData.push(point);
    });
    rectY[0].forEach(point => {
        vertexData.push(point);
    });

    var indices = [];
    for (let i = 0; i < vertexData.length; i++) {
        indices.push(i);
    }
    
    var colorData = [1,0,0,
                     0,1,0,
                     0,0,1];
    icosahedronDrawCount = vertexData.length / 3;

    //create vertex buffer
    vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    //load vertex data into buffer
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexData), gl.STATIC_DRAW);

    //create color buffer
    colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    //load buffer
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colorData), gl.STATIC_DRAW);

    //create index buffer
    indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    //create shaders
    var vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, icosahedronVertexShaderSource);
    gl.compileShader(vertexShader);
    
    var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, icosahedronFragmentShaderSource);
    gl.compileShader(fragmentShader);

    //check for shader errors
    checkShaderError(vertexShader);
    checkShaderError(fragmentShader);

    //create program and attach/link shaders
    icosahedronProgram = gl.createProgram();
    gl.attachShader(icosahedronProgram, vertexShader);
    gl.attachShader(icosahedronProgram, fragmentShader);
    gl.linkProgram(icosahedronProgram);

    //check for program errors
    checkProgramError(icosahedronProgram);

    //enable attributes
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    positionLoc = gl.getAttribLocation(icosahedronProgram, 'position');
    gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    colorLoc = gl.getAttribLocation(icosahedronProgram, 'color');
    gl.vertexAttribPointer(colorLoc, 3, gl.FLOAT, false, 0, 0);
}

function drawIcosahedron() {
    //bind framebuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
    //gl.bindFramebuffer(gl.FRAMEBUFFER, null);//straight to canvas

    //bind texture
    gl.bindTexture(gl.TEXTURE_2D, renderTexture);

    //set viewport
    gl.viewport(0, 0, resolution, resolution);
    //resizeCanvas();//BECAUSE STRAIGHT TO CANVAS

    //clear the attachments
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT| gl.DEPTH_BUFFER_BIT);

    //bind program
    gl.useProgram(icosahedronProgram);

    //bind buffers
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

    //enable attributes
    gl.enableVertexAttribArray(positionLoc);
    gl.enableVertexAttribArray(colorLoc);

    gl.drawArrays(gl.TRIANGLES, 0, icosahedronDrawCount);
}

function drawMainDisplay() {
    //bind canvas
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    //set viewport
    resizeCanvas();

    //clear the attachments
    gl.clearColor(backgroundColor[0], backgroundColor[1], backgroundColor[2], backgroundColor[3]);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    //bind the program
    gl.useProgram(displayProgram);

    //bind buffers
    gl.bindBuffer(gl.ARRAY_BUFFER, displayVB);
    gl.bindBuffer(gl.ARRAY_BUFFER, displayTC);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, displayIB);

    //bind the uniform texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, renderTexture);
    gl.uniform1i(displayTexLoc, 0);

    //enable attributes
    gl.enableVertexAttribArray(displayPosLoc);
    gl.enableVertexAttribArray(displayTexCoordLoc);

    gl.drawArrays(gl.TRIANGLES, 0, 2);
}

function resizeCanvas() {
    var width = Math.round(canvas.clientWidth * window.devicePixelRatio);
    var height = Math.round(canvas.clientHeight * window.devicePixelRatio);

    if (canvas.width != width || canvas.height != height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    }
}