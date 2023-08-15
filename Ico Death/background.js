//Get canvas and webgl context
var canvas = document.getElementsByTagName('canvas')[0];
canvas.style.width = '100%';
canvas.style.height = '100%';
var gl = canvas.getContext('webgl');

//global variables
var programs = {};
programs.state = {
    currStage: 0,
    stages: [stageOne],
    canvasSize: [1920,1080],
    squareResolution: [1,1],
    logoSize: [2000, 2000],
    loopDraw: true,
    debug: false,
    slimeOptions: {
        numAgents: 1,
        //maybe species stuff
    }
};
programs.slimeMold = {
    tracking: {
        trackingTextureResolution: Math.ceil(Math.sqrt(programs.state.slimeOptions.numAgents)),
        drawingTrail: true,
        isMainTrackingTextureA: true,
        A: null,
        B: null,
        directionMatrix: [
            0,1,
            1,1,
            1,0,
            1,-1,
            0,-1,
            -1,-1,
            -1,0,
            -1,1
        ]
    }
};

var palette = new Palette();
/* Main colors */
palette.addColors({
    primary: [0.09, 0.13, 0.17],
    secondary: [0.44, 0.49, 0.55],
    accent: [0.63, 0.8, 0.66],
    action: [0.02, 0.7, 0.95],
    alert: [0.89, 0.43, 0.35]
});
/* Objects colors */
palette.addColors({
    background: [...palette.custom.primary, 1],
    logo: [...palette.custom.accent, 1]
});

/* Objects */
var drawingObjects = {
    flatFullScreen: Rectangle.Centered(),
    icosahedron: new Icosahedron([1.1,1,1.1])
}

//attempt to start
gl ? initWebGL() : initBackup();

function initBackup() {
    //use something simpler
    alert('Webgl not supported!');
}

function initWebGL() {
    initLogoProgram();
    initSlimeMoldProgram();
    initMainDisplayProgram();

    draw();
}

function initShaderProgram(name, size, clearColor, object, vertexShaderSource, fragmentShaderSource, options, type = null) {
    var program = new GL_Program(gl, name, size, clearColor, programs.state.debug);

    //create buffers
    program.setVertexBuffer(object.vertices, type);
    if(options.colors && object.colors)
        program.setColorBuffer(object.colors);
    if(options.uvs && object.uvs)
        program.setTextureCoords(object.uvs);

    //create shaders
    program.createVertexShader(vertexShaderSource);
    program.createFragmentShader(fragmentShaderSource);

    program.init(type);

    return program;
}

function initLogoProgram() {
    var logoProgram = initShaderProgram(
        'Logo',
        [2000, 2000],
        palette.base.transparent,
        drawingObjects.icosahedron,
        logoVertexSource,
        logoFragmentSource,
        {
            uvs: true,
            colors: false
        }
    );

    //create program specific data
    logoProgram.createUniform(
        4,
        GL_Uniform.FLOAT,
        'u_logoColor',
        palette.custom.logo
    );

    logoProgram.createRenderTexture(
        'u_logoTexture',
        1,
        this.gl.TEXTURE1,
        [2000,2000]
    );

    logoProgram.createUniform(
        1,
        GL_Uniform.FLOAT,
        'u_borderSize',
        0.04
    );

    logoProgram.createUniform(
        1,
        GL_Uniform.FLOAT,
        'u_blendSize',
        0.01
    );

    var fb = logoProgram.createFramebuffer();
    logoProgram.framebuffers[fb].addTexture(logoProgram.renderTextures[0]);
    logoProgram.currFramebuffer = fb;

    programs.logoRender = logoProgram;
}

function initSlimeMoldProgram() {
    initSlimeTracking();
    initSlimeDrawing();
}

function initSlimeTracking() {
    var trackingTextureRes = programs.slimeMold.tracking.trackingTextureResolution;
    var agentTrackingA = initShaderProgram(
        'Slime Tracking A',
        [trackingTextureRes, trackingTextureRes],
        palette.base.black,
        drawingObjects.flatFullScreen,
        slimeTrackingVertexSource,
        slimeTrackingFragmentSource,
        {
            uvs: true,
            colors: false
        }
    );

    agentTrackingA.createUniform(
        2,
        GL_Uniform.FLOAT,
        'u_textureDims',
        programs.state.canvasSize
    );

    agentTrackingA.createUniform(
        1,
        GL_Uniform.INT,
        'u_myState',
        0
    );

    agentTrackingA.createUniform(
        1,
        GL_Uniform.INT,
        'u_res',
        trackingTextureRes
    );

    agentTrackingA.createUniform(
        1,
        GL_Uniform.INT,
        'u_numAgents',
        programs.state.slimeOptions.numAgents
    );

    agentTrackingA.createUniform(
        2,
        GL_Uniform.FLOAT,
        'u_directionMatix',
        programs.slimeMold.tracking.directionMatrix
    );

    agentTrackingA.createRenderTexture(
        'u_SlimeStateA',
        0,
        this.gl.TEXTURE0,
        [trackingTextureRes, trackingTextureRes]
    );

    var fbA = agentTrackingA.createFramebuffer();
    agentTrackingA.framebuffers[fbA].addTexture(agentTrackingA.renderTextures[0]);
    agentTrackingA.currFramebuffer = fbA;

    var agentTrackingB = initShaderProgram(
        'Slime Tracking B',
        [trackingTextureRes, trackingTextureRes],
        palette.base.black,
        drawingObjects.flatFullScreen,
        slimeTrackingVertexSource,
        slimeTrackingFragmentSource,
        {
            uvs: true,
            colors: false
        }
    );

    agentTrackingB.createUniform(
        2,
        GL_Uniform.FLOAT,
        'u_textureDims',
        programs.state.canvasSize
    );

    agentTrackingB.createUniform(
        1,
        GL_Uniform.INT,
        'u_myState',
        1
    );

    agentTrackingB.createUniform(
        1,
        GL_Uniform.INT,
        'u_res',
        trackingTextureRes
    );

    agentTrackingB.createUniform(
        1,
        GL_Uniform.INT,
        'u_numAgents',
        programs.state.slimeOptions.numAgents
    );

    agentTrackingB.createUniform(
        2,
        GL_Uniform.FLOAT,
        'u_directionMatrix',
        programs.slimeMold.tracking.directionMatrix
    );

    agentTrackingB.createRenderTexture(
        'u_SlimeStateB',
        0,
        this.gl.TEXTURE0,
        [trackingTextureRes, trackingTextureRes]
    );

    var fbB = agentTrackingB.createFramebuffer();
    agentTrackingB.framebuffers[fbB].addTexture(agentTrackingB.renderTextures[0]);
    agentTrackingB.currFramebuffer = fbB;

    //link swapping textures
    agentTrackingA.useRenderTexture(
        'u_SlimeState',
        1,
        this.gl.TEXTURE1,
        agentTrackingB.renderTextures[0].texture
    );

    agentTrackingB.useRenderTexture(
        'u_SlimeState',
        1,
        this.gl.TEXTURE1,
        agentTrackingA.renderTextures[0].texture
    );

    programs.slimeMold.tracking.A = agentTrackingA;
    //programs.slimeMold.tracking.B = agentTrackingB;
}

function initSlimeDrawing() {
    var verts = [];
    for(var i = 0; i < programs.state.slimeOptions.numAgents; i++) {
        verts.push(i);
    }
    
    var agentDrawing = initShaderProgram(
        'Slime Drawing',
        programs.state.canvasSize,
        palette.base.black,
        new IcoObject({ vertices: verts }),
        slimeDrawingVertexSource,
        slimeDrawingFragmentSource,
        {
            uvs: false,
            colors: false
        },
        gl.POINTS
    );

    agentDrawing.createUniform(
        1,
        GL_Uniform.INT,
        'u_NumAgents',
        programs.state.slimeOptions.numAgents
    );

    agentDrawing.createUpdatingUniform(
        1,
        GL_Uniform.INT,
        'u_CurrState',
        () => (programs.slimeMold.tracking.drawingTrail ? [0] : [1])
    )

    agentDrawing.createUniform(
        1,
        GL_Uniform.FLOAT,
        'u_PointSize',
        10
    );

    agentDrawing.createUniform(
        2,
        GL_Uniform.FLOAT,
        'u_ScreenRes',
        programs.state.canvasSize
    );

    agentDrawing.createUniform(
        1,
        GL_Uniform.FLOAT,
        'u_TextureWidth',
        programs.slimeMold.tracking.trackingTextureResolution
    );

    agentDrawing.createRenderTexture(
        'u_TrailTex',
        0,
        this.gl.TEXTURE0,
        programs.state.canvasSize
    );

    agentDrawing.useRenderTexture(
        'u_SlimeState',
        1,
        this.gl.TEXTURE1,
        programs.slimeMold.tracking.A.renderTextures[0].texture
    );

    programs.slimeMold.tracking.A.useRenderTexture(
        'u_TrailTex',
        2,
        gl.TEXTURE2,
        agentDrawing.renderTextures[0].texture
    );

    // programs.slimeMold.tracking.B.useRenderTexture(
    //     'u_TrailTex',
    //     2,
    //     gl.TEXTURE2,
    //     agentDrawing.renderTextures[0].texture
    // );

    programs.slimeMold.drawing = agentDrawing;
}

function initMainDisplayProgram() {
    var displayProgram = initShaderProgram(
        'Main Display',
        programs.state.canvasSize,
        palette.custom.background,
        drawingObjects.flatFullScreen,
        displayVertexSource,
        displayFragmentSource,
        {
            uvs: true,
            colors: false
        }
    );

    //create specific uniforms
    displayProgram.createUpdatingUniform(
        2,
        GL_Uniform.FLOAT,
        'u_resolution',
        () => programs.state.squareResolution
    );
    
    //create textures
    displayProgram.createTexture(
        'u_backgroundTexture',
        0,
        this.gl.TEXTURE0,
        null,
        null,
        this.gl.LINEAR
    );

    displayProgram.useRenderTexture(
        'u_logoTexture',
        1,
        this.gl.TEXTURE1,
        programs.logoRender.renderTextures[0].texture
    );

    displayProgram.setUpdatingSize(() => programs.state.canvasSize);

    programs.mainDisplay = displayProgram;
}

function resizeCanvas() {
    var width = Math.round(canvas.clientWidth * window.devicePixelRatio);
    var height = Math.round(canvas.clientHeight * window.devicePixelRatio);

    if (canvas.width != width)
        canvas.width = width;
    if(canvas.height != height)
        canvas.height = height;

    programs.state.canvasSize = [gl.canvas.width, gl.canvas.height];
}

function getSquareResolution() {
    //get min side length
    var width = Math.round(canvas.clientWidth * window.devicePixelRatio);
    var height = Math.round(canvas.clientHeight * window.devicePixelRatio);
    var minSide = Math.min(height, width);

    //calculate new ratios
    var ratios = [1 / (width / minSide), 1 / (height / minSide)];
    programs.state.squareResolution = ratios;
}

function setDebug() {
    programs.mainDisplay.debug = programs.state.debug;
    programs.logoRender.debug = programs.state.debug;
}

function draw() {
    setDebug();
    resizeCanvas();
    getSquareResolution();

    testingStage();
    //programs.state.stages[programs.state.currStage]();

    if(programs.state.loopDraw) requestAnimationFrame(draw);
}

///TEXTURES ARE 32 BITS PER PIXEL NOT PER CHANNEL (8 PER CHANNEL)
///Make 1 program for updating textures but use two switching framebuffers
function testingStage() {
    //save and progress state counter
    var isACurrState = programs.slimeMold.tracking.isMainTrackingTextureA;
    programs.slimeMold.tracking.isMainTrackingTextureA = !programs.slimeMold.tracking.isMainTrackingTextureA;

    //get the program required to progess the agents to next state
    var progToRun = programs.slimeMold.tracking.A;
    var texToBind = programs.slimeMold.tracking.B.renderTextures[0].texture;
    if(isACurrState) {
        progToRun = programs.slimeMold.tracking.B;
        texToBind = programs.slimeMold.tracking.A.renderTextures[0].texture;
    }

    progToRun.renderTextures[1].texture = texToBind;
    programs.slimeMold.drawing.renderTextures[0].texture = texToBind;


    //progress agents to the next state
    progToRun.draw();//true, programs.state.canvasSize);
    //programs.slimeMold.tracking.A.draw();

    //draw agents path
    programs.slimeMold.tracking.drawingTrail = true;
    programs.slimeMold.drawing.draw();

    //update the path texture(s)
    //(using agent drawing)

    //blur the path texture(s)
    //(using a blur program)

    //render final texture if it isnt blured path texture

    //draw agents
    programs.slimeMold.tracking.drawingTrail = false;
    programs.slimeMold.drawing.draw();
}

function stageOne() {
    programs.logoRender.draw();
    programs.mainDisplay.draw();
}