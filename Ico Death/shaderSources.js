/* Display */
const displayVertexSource = `
attribute vec3 a_position;
attribute vec2 a_texcoord;

varying vec2 v_ST;

void main() {
    v_ST = a_texcoord;
    gl_Position = vec4(a_position, 1);
}
`;

const displayFragmentSource = `
precision highp float;

varying vec2 v_ST;
uniform sampler2D u_backgroundTexture;
uniform sampler2D u_logoTexture;

uniform vec2 u_resolution;

float rand(float n) {
    return fract(sin(n)*100000.);
}

float remap01(float value, float min, float max) {
    return (value - min) / (max - min);
}

vec2 remap01(vec2 values, float min, float max) {
    return vec2(remap01(values.x, min, max), remap01(values.y, min, max));
}

void main() {
    vec2 uv = v_ST;
    vec4 color = texture2D(u_backgroundTexture, uv);

    vec2 squareUvs = vec2(0.25, 0.75);                  // Square start and end uvs coords
    vec2 offsets = vec2(0.25 * (1. - u_resolution));    // Uv offset for width/height so square will be square on any screen size 
                                                        // one will always be 1 while the other will be a decimal. eg: (1, 0.94), (0.39, 1), ect.
    
    //uvs squareUvs[0] + offset[0] to squareUvs[1] - offset[1] remap to 0-1
    if(uv.x >= squareUvs.x + offsets.x && uv.x <= squareUvs.y - offsets.x &&
       uv.y >= squareUvs.x + offsets.y && uv.y <= squareUvs.y - offsets.y) {
        uv.x = remap01(uv.x, squareUvs.x + offsets.x, squareUvs.y - offsets.x);
        uv.y = remap01(uv.y, squareUvs.x + offsets.y, squareUvs.y - offsets.y);
        
        vec4 logoSamp = texture2D(u_logoTexture, uv);

        //Temp white border
        //if(uv.x <= 0.01 || uv.x >= 0.99 ||
        //   uv.y <= 0.01 || uv.y >= 0.99)
        //   logoSamp = vec4(1);
        
        color += logoSamp * logoSamp.a;
    }

    gl_FragColor = color;
}
`;

/* Logo */

const logoVertexSource = `
attribute vec3 a_position;
attribute vec2 a_texcoord;

varying vec2 v_ST;

void main() {
    v_ST = a_texcoord;
    gl_Position = vec4(a_position, 1);
}
`;

const logoFragmentSource = `
precision highp float;

varying vec2 v_ST;
uniform vec4 u_logoColor;
uniform float u_borderSize;
uniform float u_blendSize;

void main() {
    float borderSize = max(0.001, u_borderSize);
    float blendSize = max(0.001, u_blendSize);

    float leftSide = 1. - smoothstep(borderSize, borderSize + blendSize, v_ST.x);
    float botSide = 1. - smoothstep(borderSize, borderSize + blendSize, v_ST.y);
    float diagonal = 1. - smoothstep(1. - borderSize, 1. - (borderSize + blendSize), v_ST.x + v_ST.y);

    vec4 color = vec4(vec3(min(1., leftSide + botSide + diagonal)), 1);
    color *= u_logoColor;

    gl_FragColor = color;//mix(color, vec4(0,0,0,0), t);
}`;

/* Slime Mold */
const slimeDrawingVertexSource =
`
attribute float a_position;
attribute vec2 a_texcoord;

float bitsPerChannel = 32.;
float bitsPerDirection = 3.;
float edgeBorder = 0.01;

uniform int u_NumAgents;
uniform int u_CurrState;
uniform float u_PointSize;

uniform vec2 u_ScreenRes;

uniform float u_TextureWidth;
uniform sampler2D u_SlimeState;

int bitShift(int num, float shiftNum) {
    return num * int(pow(2., shiftNum));
}

vec2 GetPos(float posBits) {
    float xBits = ceil(bitsPerChannel - bitsPerDirection/2.);
    float yBits = bitsPerChannel - bitsPerDirection - xBits;

    float agentY = bitShift(posBits, xBits); //posBits * pow(2.,xBits);
    float agentX = bitShift(posBits, -(yBits + bitsPerDirection)); //posBits / pow(2.,yBits + bitsPerDirection);

    return vec2(agentX, agentY);
}

vec3 Decode(int data) {
    //get direction from first 3 bits
    int direction = bitShift(data, -(bitsPerChannel - bitsPerDirection)); //data / int(pow(2.,bitsPerChannel - bitsPerDirection));

    //get position
    vec2 agentPos = GetPos(bitShift(data, bitsPerDirection)); //data * int(pow(2., bitsPerDirection)));

    return vec3(agentPos, direction);
}

void main() {
    vec2 index = vec2(floor(a_position / u_TextureWidth), floor(mod(a_position, u_TextureWidth)));

    vec3 agentData = Decode(int(texture2D(u_SlimeState, index).r));
    vec2 res = u_ScreenRes;

    vec2 pos = vec2(agentData.x, 0.);// agentData.y);

    gl_Position = vec4(((pos / res) * (1.-edgeBorder)) - (1.-edgeBorder),0,1);
    gl_PointSize = (u_CurrState == 1 ? u_PointSize : 1.);
}`;

const slimeDrawingFragmentSource =
`precision highp float;

void main() {
    gl_FragColor = vec4(1);
}`;

const slimeTrackingVertexSource = `
attribute vec3 a_position;
attribute vec2 a_texcoord;

varying vec2 v_ST;

void main() {
    v_ST = a_texcoord;
    gl_Position = vec4(a_position, 1);
}`;

const slimeTrackingFragmentSource =
`precision highp float;
float bitsPerChannel = 32.;
float bitsPerDirection = 3.;
float numDirections = 8.;

varying vec2 v_ST;

uniform vec2 u_textureDims;
uniform sampler2D u_SlimeState;
uniform sampler2D u_TrailTex;

uniform int u_myState;
uniform int u_res;
uniform int u_numAgents;

uniform vec2 u_directionMatrix[8];

vec2 DirToVec2(float dir) {
    if (dir == 0.)
        return u_directionMatrix[0];
    else if (dir == 1.)
        return u_directionMatrix[1];
    else if (dir == 2.)
        return u_directionMatrix[2];
    else if (dir == 3.)
        return u_directionMatrix[3];
    else if (dir == 4.)
        return u_directionMatrix[4];
    else if (dir == 5.)
        return u_directionMatrix[5];
    else if (dir == 6.)
        return u_directionMatrix[6];
    else
        return u_directionMatrix[7];
}

int bitShift(int num, float shiftNum) {
    return num * int(pow(2., shiftNum));
}

ivec3 GetPos(int posBits) {
    float xBits = ceil(bitsPerChannel - bitsPerDirection/2.);
    float yBits = bitsPerChannel - bitsPerDirection - xBits;

    int agentY = bitShift(posBits, xBits); //posBits * pow(2.,xBits);
    int agentX = bitShift(posBits, -(yBits + bitsPerDirection)); //posBits / pow(2.,yBits + bitsPerDirection);

    return ivec3(agentX, agentY, int(xBits));
}

ivec4 Decode(int data) {
    //get direction from first 3 bits
    int direction = bitShift(data, -(bitsPerChannel - bitsPerDirection)); //data / pow(2.,bitsPerChannel - bitsPerDirection);

    //get position
    ivec3 agentPos = GetPos(bitShift(data, bitsPerDirection)); //data * pow(2., bitsPerDirection));

    return ivec4(agentPos.xy, direction, agentPos.z);
}

float turn(float current, float amount) {
    return mod(current + numDirections + amount, numDirections);
}

float rand(float x) {
    return fract(sin(x)*1000000.);
}

vec4 GetTrailSample(vec2 pos, float dir) {
    vec2 samplePos = pos + DirToVec2(dir);
    return (samplePos.x < 0. || samplePos.x > u_textureDims.x ||
            samplePos.y < 0. || samplePos.y > u_textureDims.y ? vec4(0) : texture2D(u_TrailTex, samplePos));
}

float UpdateDirection(vec3 data, vec4 trailMask, float index) {//[x,y,dir]
    //sample trail texture on left, in front, and on right
    float leftDir = turn(data.z, -1.);
    float rightDir = turn(data.z, 1.);
    vec4 onLeft = trailMask * GetTrailSample(data.xy, leftDir);
    vec4 inFront = trailMask * GetTrailSample(data.xy, data.z);
    vec4 onRight = trailMask * GetTrailSample(data.xy, rightDir);

    //add sample channels together
    float leftSum = onLeft.r + onLeft.g + onLeft.b + onLeft.a;
    float midSum = inFront.r + inFront.g + inFront.b + inFront.a;
    float rightSum = onRight.r + onRight.g + onRight.b + onRight.a;

    //get direction of largest sample
    vec2 newDir = vec2(midSum, data.z);
    if(leftSum > newDir.x)
        newDir = vec2(leftSum, leftDir);
    if(rightSum > newDir.x)
        newDir = vec2(rightSum, rightDir);

    //add some random to the turning
    float randTurn = floor(rand(index + rand(data.x) + rand(data.y)) * 3.) - 1.;//-1 to 1

    return turn(newDir.y, randTurn);
}

ivec3 Update(ivec3 data, ivec4 trailMask, int index) {//[x,y,dir]
    //update position
    data += ivec3(DirToVec2(data.z), 0);

    int clampedX = int(max(0., min(u_textureDims.x, data.x)));
    int clampedY = int(max(0., min(u_textureDims.y, data.y)));

    if(data.x != clampedX) { // bounce
        data.x = clampedX;
        //sub
    }
    data.y = clampedY;
     
    
    //update direction
    data += ivec3(0,0,2);//UpdateDirection(data, trailMask, index));

    return data;
}

int Encode(ivec3 data, int xPosBits) {//[x,y,dir]
    int encodedData = 0;

    //encode direction
    encodedData += data.z;
    encodedData = bitShift(encodedData, bitsPerDirection); //encodedData * pow(2., bitsPerDirection);

    //encode x
    encodedData += data.x;
    encodedData = bitShift(encodedData, xPosBits); //encodedData * pow(2., xPosBits);

    //encode y
    encodedData += data.y;

    return encodedData;
}

void main() {
    vec2 samplePos = v_ST * float(u_res);
    vec2 uv = fract(samplePos);
    vec2 coord = floor(samplePos);

    int index = int(coord.x + (coord.y * float(u_res)));
    if (index >= u_numAgents) discard;

    vec4 prevState = texture2D(u_SlimeState, coord);

    float currChannel = prevState.r;

    ivec4 decodeData = Decode(int(currChannel));

    //[x,y,dir]
    ivec3 data = decodeData.xyz;

    //update position and direction
    ivec4 trailMask = ivec4(1,0,0,0);
    data = Update(data, trailMask, index);

    //encode data
    int dataOutput = Encode(data, decodeData.w);

    //set color as data output
    vec3 color = vec3(float(dataOutput),0,0);

    gl_FragColor = vec4(color,1);
}`;

/* Experimenting */
const uvSlideFragmentSource = `
    precision highp float;

    varying vec2 v_ST;
    uniform sampler2D u_texture;

    float _rows = 1., _cols = 1.;
    float scale = 4.;

    float tilt = 3.;

    uniform vec4 u_backgroundColor;

    void main() {
        float rows = _rows * scale, cols = _cols * scale;
        vec2 pixLoc = vec2(v_ST.x * rows, (v_ST.y * cols) + mod(v_ST.x * tilt, 2.));

        vec2 uv = fract(pixLoc);

        uv.y = fract(uv.y);// + (floor(mod(v_ST.x * 2., 2.)) / 2.) );

        vec4 color = u_backgroundColor;

        color = texture2D(u_texture, uv);

        gl_FragColor = color;
    }
`;

const randomGridFragmentSource = `
    precision highp float;

    varying vec2 v_ST;

    float _rows = 5., _cols = 3.;
    float scale = 4.;

    float rand(float n) {
        return fract(sin(n)*100000.);
    }

    void main() {
        float rows = _rows * scale, cols = _cols * scale;
        vec2 pixLoc = vec2(v_ST.x * rows, v_ST.y * cols);
        
        vec2 coord = floor(pixLoc);
        vec2 uv = fract(pixLoc);

        gl_FragColor = vec4(vec3(rand(coord.x + (coord.y*rows))),1);
    }
`;

const textureCoordTestingFragmentSource = `
    precision highp float;

    varying vec2 v_ST;

    void main() {
        gl_FragColor = vec4(v_ST.x,v_ST.y,0,1);
    }
`;

/* Old */
const ___icosahedronVertexShaderSource = `
attribute vec3 position;
attribute vec3 color;
varying vec3 vColor;
void main() {
    vColor = color;
    gl_Position = vec4(position, 1);
}`;

const ___icosahedronFragmentShaderSource = `
precision highp float;
varying vec3 vColor;
void main() {
    gl_FragColor = vec4(vColor, 1);
}`;

const ___displayVertexShaderSource = `
attribute vec3 position;
attribute vec2 texcoord;
varying vec2 vST;

void main() {
    vST = texcoord;
    gl_Position = vec4(position, 1);
}`;

const ___displayFragmentShaderSource = `
precision highp float;

varying vec2 vST;
uniform sampler2D uTexture;

void main() {
    gl_FragColor = vec4(1,1,1,1);//texture2D(uTexture, vST);
}`;