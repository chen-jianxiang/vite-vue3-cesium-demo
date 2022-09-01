import * as Cesium from 'cesium';

// 特效方法实例
export function specialEffects (){

  function CircleWaveMaterialProperty (color, duration, count, gradient) {
    this._definitionChanged = new Cesium.Event()
    this._color = undefined
    this._colorSubscription = undefined
    this.color = color
    this.duration = Cesium.defaultValue(duration, 1e3)
    this.count = Cesium.defaultValue(count, 2)
    if (this.count <= 0) this.count = 1
    this.gradient = Cesium.defaultValue(gradient, 0.1)
    if (this.gradient < 0) this.gradient = 0
    else if (this.gradient > 1) this.gradient = 1
    this._time = performance.now()
  }
  Object.defineProperties(CircleWaveMaterialProperty.prototype, {
    isConstant: {
      get: function () {
        return false
      }
    },
    definitionChanged: {
      get: function () {
        return this._definitionChanged
      }
    },
    color: Cesium.createPropertyDescriptor('color')
  })

  const CircleWaveMaterialType = 'CircleWaveMaterial';
  const CircleWaveSource = `czm_material czm_getMaterial(czm_materialInput materialInput)\n
    {\n
        czm_material material = czm_getDefaultMaterial(materialInput);\n
        material.diffuse = 1.5 * color.rgb;\n
        vec2 st = materialInput.st;\n
        vec3 str = materialInput.str;\n
        float dis = distance(st, vec2(0.5, 0.5));\n
        float per = fract(time);\n
        if (abs(str.z) > 0.001) {\n
            discard;\n
        }\n
        if (dis > 0.5) { \n
            discard; \n
        } else { \n
            float perDis = 0.5 / count;\n
            float disNum; \n                       
            float bl = .0; \n                       
            for (int i = 0; i <= 999; i++) { \n                           
                if (float(i) <= count) { \n                               
                  disNum = perDis *
    float(i) - dis + per / count; \n                             
                    if (disNum > 0.0) { \n                                 
                        if (disNum < perDis) { \n                                     
                            bl = 1.0 - disNum / perDis;\n
                        }\n                                 
                      else if
    (disNum - perDis < perDis) { \n                                       
                                bl = 1.0 - abs(1.0 - disNum / perDis); \n
                        } \n                                 
                        material.alpha = pow(bl, gradient); \n
                    } \n
                } \n
            } \n
        } \n
    return material; \n
    } \n`;

  CircleWaveMaterialProperty.prototype.getType = function (time) {
    return CircleWaveMaterialType
  }
  CircleWaveMaterialProperty.prototype.getValue = function (time, result) {
    if (!Cesium.defined(result)) {
      result = {}
    }
    result.color = Cesium.Property.getValueOrClonedDefault(this._color, time, Cesium.Color.WHITE, result.color)
    result.time = (((new Date()).getTime() - this._time) % this.duration) / this.duration
    result.count = this.count
    result.gradient = 1 + 10 * (1 - this.gradient)
    return result
  }
  CircleWaveMaterialProperty.prototype.equals = function (other) {
    return this === other ||
      (other instanceof CircleWaveMaterialProperty &&
        Cesium.Property.equals(this._color, other._color))
  }
  // 检测对象是否是可扩展的
  // if(Object.isExtensible(Cesium)){
  //   Cesium.CircleWaveMaterialProperty = CircleWaveMaterialProperty
  // }else{
  //   CircleWaveMaterialProperty.bind(Cesium)
  // }
  Cesium.Material._materialCache.addMaterial(CircleWaveMaterialType, {
    fabric: {
      type: CircleWaveMaterialType,
      uniforms: {
        color: new Cesium.Color(1.0, 0.0, 0.0, 1.0),
        time: 1,
        count: 1,
        gradient: 0.1
      },
      source: CircleWaveSource,
    },
    translucent: function (material) {
      return !0
    }
  })
  return CircleWaveMaterialProperty.bind(Cesium)
};