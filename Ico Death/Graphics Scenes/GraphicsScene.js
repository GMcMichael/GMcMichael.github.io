//Get canvas and webgl context
var canvas = document.getElementsByTagName('canvas')[0];
canvas.style.width = '100%';
canvas.style.height = '100%';
var gl = canvas.getContext('webgl');

//global variables
var program = {};
program.state = {
    canvasSize: [1920,1080],
    viewRatio: [1,1],
    loopDraw: true,
    debug: false,
    voronoi: {
        viewOffset: [0,0],//[6342,9292], [41814,84313], [34266, 7424]
        cellDensity: 10,
        scatterPower: 0.5,//0-0.5
        borderWidth: 0.02,
        borderTol: 0.01,
        borderColor: [0,0,0]
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
gl ? initWebGL() : alert('Webgl not avaliable');

function resizeCanvas() {
    var width = Math.round(canvas.clientWidth * window.devicePixelRatio);
    var height = Math.round(canvas.clientHeight * window.devicePixelRatio);

    if (canvas.width != width)
        canvas.width = width;
    if(canvas.height != height)
        canvas.height = height;

    program.state.canvasSize = [gl.canvas.width, gl.canvas.height];
}

function getViewRatio() {
    //get min side length
    var width = Math.round(canvas.clientWidth * window.devicePixelRatio);
    var height = Math.round(canvas.clientHeight * window.devicePixelRatio);
    var minSide = Math.min(height, width);

    //calculate new ratios
    var ratios = [1 / (height / minSide), 1 / (width / minSide)];
    program.state.viewRatio = ratios;
}

function draw() {
    resizeCanvas();
    getViewRatio();

    //programs.sdfProgram.draw();
    program.voronoiProgram.draw();

    if(program.state.loopDraw) requestAnimationFrame(draw);
}

function initWebGL() {
    resizeCanvas();
    initSDFShader();
    initVoronoiShader();
    draw();
}

function initSDFShader() {
    var sdfProgram = 
    GL_Program.initShaderProgram(
        'SDF Test',
        program.state.canvasSize,
        palette.base.black,
        drawingObjects.flatFullScreen,
        SDFVertexSource,
        SDFFragmentSource,
        {
            uvs: true,
            colors: false
        }
    );

    program.sdfProgram = sdfProgram;
}

function initVoronoiShader() {
    var voronoiProgram =
    GL_Program.initShaderProgram(
        'Voronoi',
        program.state.canvasSize,
        palette.base.black,
        drawingObjects.flatFullScreen,
        voronoiVertexSource,
        voronoiFragmentSource,
        {
            uvs: true,
            colors: false
        }
    );

    voronoiProgram.createUpdatingUniform(
        2,
        GL_Uniform.FLOAT,
        'u_viewRatio',
        () => program.state.viewRatio
    );

    voronoiProgram.createUpdatingUniform(
        2,
        GL_Uniform.FLOAT,
        'u_viewOffset',
        () => program.state.voronoi.viewOffset
    );

    voronoiProgram.createUpdatingUniform(
        1,
        GL_Uniform.FLOAT,
        'u_cellDensity',
        () => [program.state.voronoi.cellDensity]
    );

    voronoiProgram.createUpdatingUniform(
        1,
        GL_Uniform.FLOAT,
        'u_scatterPower',
        () => [program.state.voronoi.scatterPower]
    );

    voronoiProgram.createUniform(
        1,
        GL_Uniform.FLOAT,
        'u_borderWidth',
        program.state.voronoi.borderWidth
    );

    voronoiProgram.createUniform(
        1,
        GL_Uniform.FLOAT,
        'u_borderTol',
        program.state.voronoi.borderTol
    );

    voronoiProgram.createUniform(
        3,
        GL_Uniform.FLOAT,
        'u_borderColor',
        program.state.voronoi.borderColor
    );

    program.voronoiProgram = voronoiProgram;
}