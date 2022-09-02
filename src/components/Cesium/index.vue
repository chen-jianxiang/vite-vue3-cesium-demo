<template>
  <div class="cesium_dom" id="CesiumDom" ref="CesiumDom"></div>
</template>

<script setup>
import * as Cesium from 'cesium';
// import Viewer from 'cesium/Source/Widgets/Viewer/Viewer';
import "cesium/Build/Cesium/Widgets/widgets.css";
import _ from 'lodash';

import partyMemberIcon from './社区打点.png'; 
import partyMemberSelectIcon from './社区打点-选中.png'; 

import { initCluster, renderCluster, getPointsByClusterId } from './SuperClusterUtils';
import { specialEffects } from './CircleWaveMaterialProperty'

import { ref, onMounted } from 'vue';


window.CESIUM_BASE_URL = '/static/Cesium/';

let billboardCollection = null;
let CircleWaveMaterialProperty = null;
let EllipseModel = null;
Cesium.Ion.defaultAccessToken =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI1MjliNzQ1NC0wNzdiLTQ1NTQtOTMyOS05NjU0ZGRjNjc4YjQiLCJpZCI6NjA1NzIsImlhdCI6MTYyNTE5MDEwNn0.2Ql_LmCcsXuT9OWu4cpjK8aJTMlas1j0dlFrM87-FWg';

onMounted(() => {
  const viewer = createViewer('CesiumDom');

  let customDataSource = new Cesium.CustomDataSource(
    '设备点位数据源',
  );


  // const dataSource = Cesium.GeoJsonDataSource.load(
  //   "/places.json"
  // );
  // viewer.dataSources.add(dataSource);

  let index;

  // fetch('/places.json').then(res=>{
  //   return res.json();
  // }).then(async geojson=>{
  //   index = await initCluster(geojson.features);
  //   // console.log(index.getTile(0, 0, 0));
  //   render(viewer,index)
  // })
  fetch(
    'http://10.40.127.45:8081/device/selectByCellName',{
      method: 'POST',
      headers: {
        // 'Authorization': 'Bearer 3709fcea-9d15-413d-8940-552f3984ed90',
        'Content-Type': 'application/json;charset=UTF-8',
      },
      body:JSON.stringify({productId:[]})
    }).then(res=>{
    return res.json();
  }).then(async res=>{
    console.log(res);
    const features =  res.data.deviceList.map(item=>{
      return{
        type: "Feature",
        geometry:{
          type: "Point",
          coordinates:[item.longitude,item.latitude],
        },
        properties:item
      }
    })
    index = await initCluster(features);
    console.log(index);
    render(viewer,index)
    setTimeout(()=>{
      // viewer.flyTo();
    })
  })
  
  viewer.camera.changed.addEventListener(
    _.debounce(function () {
      render(viewer,index);
      if(EllipseModel){
        const height = Math.ceil(viewer.camera.positionCartographic.height)
        EllipseModel.ellipse.semiMinorAxis = height * 0.05;
        EllipseModel.ellipse.semiMajorAxis = height * 0.05;
        console.log(EllipseModel);
      }
    }, 200),
  );
  viewer.screenSpaceEventHandler.setInputAction(async (movement) =>{
    // let pickedFeatures = viewer.scene.drillPick(movement.position);
    // console.log('选中位置',movement.position);
    const pickedFeature = viewer.scene.pick(movement.position);
    // console.log('选中元素',pickedFeature);
    if(pickedFeature){
      const primitive = pickedFeature.primitive;
      
      const params = primitive.id;
      if(params.cluster){
        const points =await getPointsByClusterId(index, params.cluster_id, params.point_count, 0);
        console.log(params,points);
      }else{
        console.log(params);
        EllipseModel = getEllipseModel2(viewer,params.longitude,params.latitude);
      }
      
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

});

async function render(viewer,index){
  if(index){
    const features = await renderCluster(viewer, index);
    // console.log(level,features);

    if (billboardCollection) {
      billboardCollection.removeAll();
    }else{
      billboardCollection = viewer.scene.primitives.add(
        new Cesium.BillboardCollection({
          scene: viewer.scene,
          blendOption: Cesium.BlendOption.OPAQUE,
        })
      );
    }
    
    const fillText = await createCanvas(partyMemberIcon);
    // console.log(partyMemberIcon);
    features.map(async feature=>{
      let image,width,height,verticalOrigin;
      if(feature.properties.cluster){
        // const pinBuilder = new Cesium.PinBuilder();
        // image = pinBuilder.fromText(feature.properties.point_count_abbreviated, Cesium.Color.BLUE, 48).toDataURL();
        image = fillText(feature.properties.point_count_abbreviated)
        width = 45;
        height = 45;
        verticalOrigin = Cesium.VerticalOrigin.BOTTOM;
      }else{
        image = getIcon(feature.properties);
        width = 32;
        height = 32;
        verticalOrigin = Cesium.VerticalOrigin.CENTER;
      }
      billboardCollection.add({
        position: Cesium.Cartesian3.fromDegrees(feature.geometry.coordinates[0], feature.geometry.coordinates[1], 0),
        id: feature.properties,
        image: image,
        imageId: feature.properties.point_count_abbreviated || image,
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        verticalOrigin,
        width,
        height,
      })
    })
  }
}

function getIcon({isStatus,onlineStatus,productImg}, select){
  let imgUrl = null 
  const deviceSelectIcon = productImg.jscImgSelected;
  if(isStatus==1){ // 无权限
    if(onlineStatus==1){ // 正常
      imgUrl = select ? deviceSelectIcon : productImg.jscImgNo;
    }else{ // 故障
      imgUrl = select ? deviceSelectIcon : productImg.jscImgFaultNo;
    }
  }else if(isStatus==2){ // 有权限
    if(onlineStatus==1){ // 正常
      imgUrl = select ? deviceSelectIcon : productImg.jscImgHave;
    }else{ // 故障
      imgUrl = select ? deviceSelectIcon : productImg.jscImgFaultHave;
    }
  }
  const Img = new Image()
  Img.setAttribute('crossOrigin', 'Anonymous')
  Img.src = imgUrl; // 转换图片为dataURL
  return imgUrl
};

// 圆圈模型红色多线圈
function getEllipseModel2 (viewer,longitude, latitude) {
  const height = Math.ceil(viewer.camera.positionCartographic.height)
  return viewer.entities.add({
    id: 'Ellipse2',
    name: 'Ellipse2',
    position: new Cesium.Cartesian3.fromDegrees(longitude, latitude, 0),
    ellipse: {
      height: 0,
      semiMinorAxis: height * 0.05,
      semiMajorAxis: height * 0.05,
      material: new CircleWaveMaterialProperty(Cesium.Color.fromCssColorString('#E54030'), 2e3, 3, 0)
    }
  })
}

function createCanvas(url) {
  return new Promise((resolve, reject) => { //同步
    const Img = new Image()
    // let dataURL = ''
    Img.setAttribute('crossOrigin', 'Anonymous')
    Img.src = url
    Img.onload = function() {
      // 要先确保图片完整获取到，这是个异步事件
      const canvas = document.createElement('canvas') // 创建canvas元素
      // 确保canvas的尺寸和图片一样
      const width = Img.width 
      const height = Img.height

      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d');
      ctx.fillStyle = "red";  // 填充颜色为红色

      // ctx.strokeStyle = "blue";  // 画笔的颜色
      // ctx.lineWidth = 5;  // 指定描边线的宽度

      // ctx.beginPath();

      ctx.font=`bold ${width/2}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.save(); // 保存当前环境的状态。
      // ctx.fillText(text,width/2,height/2);
      // dataURL = 
      resolve(function fillText(text ){
        ctx.clearRect(0, 0, width, height);
        // 将图片绘制到canvas中
        ctx.drawImage(Img, 0, 0, width, height);
        text && ctx.fillText(text,width/2,height/2);
        // ctx.restore();
        // ctx.closePath();
        const Img2 = new Image()
        // Img2.setAttribute('crossOrigin', 'Anonymous')
        // Img2.width = width;
        // Img2.height = height;
        Img2.src = canvas.toDataURL('image/png') // 转换图片为dataURL
        return canvas.toDataURL('image/png');
      })
    }
  })
}

function createViewer(id) {
  const viewer = new Cesium.Viewer(id, {
    // terrainProvider: Cesium.createWorldTerrain()
    infoBox: false,
  });

  viewer.scene.debugShowFramesPerSecond = true;
  CircleWaveMaterialProperty = specialEffects();
  return viewer;
}

</script>


<style lang="scss" scoped>
.cesium_dom{
  background-color: aqua;
}
</style>
