import Supercluster from 'supercluster';

import * as Cesium from 'cesium';

/**
 * https://www.npmjs.com/package/supercluster
 * @param {*} points 
 * @param  {...any} options 
 * @returns 
 */
export function initCluster(points,...options){
  const index = new Supercluster({
    log: true,
    radius: 45,
    extent: 256,
    maxZoom: 26,
    ...options
  });
  return new Promise((resolve)=>{
    index.load(points);
    resolve(index)
  })
}

export function renderCluster(viewer,index){
  return new Promise((resolve,reject)=>{
    if(index){
      const rectangle = viewer.camera.computeViewRectangle();
      const east = Cesium.Math.toDegrees(rectangle.east),
            north = Cesium.Math.toDegrees(rectangle.north),
            west = Cesium.Math.toDegrees(rectangle.west),
            south = Cesium.Math.toDegrees(rectangle.south),
            level = heightToZoom(viewer);
      const features = index.getClusters([west, south, east, north], level);
      resolve(features)
    }else{
      reject()
    }
  })
}

export function getPointsByClusterId(index,clusterId, limit = 10, offset = 0){
  return new Promise((resolve,reject)=>{
    if(index){
      const points = index.getLeaves(clusterId,limit,offset);
      resolve(points)
    }else{
      reject()
    }
  })
}

export function heightToZoom(viewer) {
  const height = Math.ceil(viewer.camera.positionCartographic.height)
  const A = 40487.57
  const B = 0.00007096758
  const C = 91610.74
  const D = -40467.74
  return Math.round(D + (A - D) / (1 + Math.pow(height / C, B)))
}