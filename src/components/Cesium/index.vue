<template>
  <div class="cesium_dom" id="CesiumDom" ref="CesiumDom"></div>
</template>

<script setup>
import * as Cesium from 'cesium';
// import Viewer from 'cesium/Source/Widgets/Viewer/Viewer';
import "cesium/Build/Cesium/Widgets/widgets.css";

import partyMemberIcon from './社区打点.png'; 
import partyMemberSelectIcon from './社区打点-选中.png'; 

import { ref, onMounted } from 'vue';


window.CESIUM_BASE_URL = '/static/Cesium/';

let billboardCollection = null;
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
  //   index = 
  //     await new Supercluster({
  //       log: true,
  //       radius: 60,
  //       extent: 256,
  //       maxZoom: 17
  //     }).load(geojson.features);
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
      body:JSON.stringify({productId:["8ZS6DQMKBT", "A6FQPQRMT4", "ENINV6GGZ0", "QBYSAKKZW8"]})
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
    index = 
      await new Supercluster({
        log: true,
        radius: 40,
        extent: 256,
        maxZoom: 26
      }).load(features);
    console.log(index);
    render(viewer,index)
    setTimeout(()=>{
      // viewer.flyTo();
    })
  })
  
  viewer.camera.changed.addEventListener(() =>{
    setTimeout(()=>{
      render(viewer,index)
    })
  },);
  viewer.screenSpaceEventHandler.setInputAction((movement) =>{
    // let pickedFeatures = viewer.scene.drillPick(movement.position);
    console.log(movement.position);
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

});

function render(viewer,index){
  const rectangle = viewer.camera.computeViewRectangle();
  const east = Cesium.Math.toDegrees(rectangle.east),
        north = Cesium.Math.toDegrees(rectangle.north),
        west = Cesium.Math.toDegrees(rectangle.west),
        south = Cesium.Math.toDegrees(rectangle.south);

  console.log('东',east,'北',north,'南',south,'西',west);
  if(index){
    const level = heightToZoom(viewer);
    const features = index.getClusters([west, south, east, north], level);
    console.log(level,features);

    if (billboardCollection) {
      billboardCollection.removeAll();
      // viewer.scene.primitives.remove(billboardCollection);
    }else{
      billboardCollection = viewer.scene.primitives.add(
        new Cesium.BillboardCollection({
          scene: viewer.scene,
          blendOption: Cesium.BlendOption.OPAQUE,
        })
      );
      // billboardCollection = new Cesium.BillboardCollection({
      //   scene: viewer.scene,
      //   blendOption: Cesium.BlendOption.OPAQUE,
      // });
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
    // viewer.scene.primitives.add(billboardCollection)
  }
}

function heightToZoom(viewer) {
    const height = Math.ceil(viewer.camera.positionCartographic.height)
    const A = 40487.57
    const B = 0.00007096758
    const C = 91610.74
    const D = -40467.74
    return Math.round(D + (A - D) / (1 + Math.pow(height / C, B)))
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

function createViewer(id) {
  const viewer = new Cesium.Viewer(id, {
    // terrainProvider: Cesium.createWorldTerrain()
  });

  viewer.scene.debugShowFramesPerSecond = true;
  
  return viewer;
}

</script>


<style lang="scss" scoped>
.cesium_dom{
  background-color: aqua;
}
</style>
