<template>
  <div class="cesium_dom" id="CesiumDom" ref="CesiumDom"></div>
</template>

<script setup>
import * as Cesium from 'cesium';
// import Viewer from 'cesium/Source/Widgets/Viewer/Viewer';
import "cesium/Build/Cesium/Widgets/widgets.css";

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
  //   render(viewer,customDataSource,index)
  // })
  fetch(
    'http://10.40.127.45:8081/device/selectByCellName',{
      method: 'POST',
      headers: {
        'Authorization': 'Bearer 3709fcea-9d15-413d-8940-552f3984ed90',
        'Content-Type': 'application/json;charset=UTF-8',
      },
      body:JSON.stringify({productId:[]})
    }).then(res=>{
    return res.json();
  }).then(async res=>{
    // console.log(res);
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
  
  viewer.camera.changed.addEventListener(() =>{
    setTimeout(()=>{
      render(viewer,index);
      if(EllipseModel){
        const height = Math.ceil(viewer.camera.positionCartographic.height)
        EllipseModel.ellipse.semiMinorAxis = height * 0.05;
        EllipseModel.ellipse.semiMajorAxis = height * 0.05;
        console.log(EllipseModel);
      }
    })
  },);
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
    

    features.map(feature=>{
      let image,width,height,verticalOrigin;
      if(feature.properties.cluster){
        const pinBuilder = new Cesium.PinBuilder();
        image = pinBuilder.fromText(feature.properties.point_count_abbreviated, Cesium.Color.BLUE, 48).toDataURL();
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
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        verticalOrigin,
        width,
        height,
      })
    })
  }
}

function getIcon({isStatus,onlineStatus,productImg}, select){
  const deviceSelectIcon = productImg.jscImgSelected;
    if(isStatus==1){ // 无权限
      if(onlineStatus==1){ // 正常
        return select ? deviceSelectIcon : productImg.jscImgNo;
      }else{ // 故障
        return select ? deviceSelectIcon : productImg.jscImgFaultNo;
      }
    }else if(isStatus==2){ // 有权限
      if(onlineStatus==1){ // 正常
        return select ? deviceSelectIcon : productImg.jscImgHave;
      }else{ // 故障
        return select ? deviceSelectIcon : productImg.jscImgFaultHave;
      }
    }
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

function createViewer(id) {
  const viewer = new Cesium.Viewer(id, {
    // terrainProvider: Cesium.createWorldTerrain()
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
