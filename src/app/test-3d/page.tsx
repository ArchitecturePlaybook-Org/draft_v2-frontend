import ModelViewer from '@/components/ModelViewer';

export default function Test3DPage() {
  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold">3D Model Viewer Testing</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">GLB Model</h2>
          {/* Replace this URL with a valid GLB/GLTF model URL */}
          <div className="aspect-video">
            <ModelViewer format="glb" url="https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb" />
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">OBJ Model</h2>
          {/* Replace this URL with a valid OBJ model URL */}
          <div className="aspect-video">
             <ModelViewer format="obj" url="https://raw.githubusercontent.com/alecjacobson/common-3d-test-models/master/data/cube.obj" />
          </div>
        </div>
      </div>
    </div>
  );
}
