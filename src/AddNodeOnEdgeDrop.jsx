import React, { useCallback, useRef } from "react";
import ReactFlow, { addEdge, useReactFlow, useStoreApi } from "reactflow";
import "../src/components/ReactFlow/updatenode.css";

const MIN_DISTANCE = 150;
const getId = () => `node_${+new Date()}`;

const AddNodeOnEdgeDrop = ({
  nodes,
  setNodes,
  edges,
  setEdges,
  onNodesChange,
  onEdgesChange,
  onNodeClick,
  onNodesDelete,
  setRfInstance,
}) => {
  const reactFlowWrapper = useRef(null);
  const connectingNodeId = useRef(null);
  const { screenToFlowPosition } = useReactFlow();
  const store = useStoreApi();

  const onConnect = useCallback(
    (params) => {
      connectingNodeId.current = null;
      setEdges((eds) => addEdge(params, eds));
    },
    [setEdges]
  );

  const onConnectStart = useCallback((_, { nodeId }) => {
    connectingNodeId.current = nodeId;
  }, []);

  const onConnectEnd = useCallback(
    (event) => {
      if (!connectingNodeId.current) return;

      const targetIsPane = event.target.classList.contains("react-flow__pane");

      if (targetIsPane) {
        const id = getId();
        const newNode = {
          id,
          position: screenToFlowPosition({
            x: event.clientX,
            y: event.clientY,
          }),
          data: { label: `Node ${id}` },
          type: "customNode",
        };

        setNodes((nds) => nds.concat(newNode));
        setEdges((eds) =>
          eds.concat({
            id: `e${connectingNodeId.current}-${id}`,
            source: connectingNodeId.current,
            target: id,
          })
        );
      }
    },
    [screenToFlowPosition, setNodes, setEdges]
  );

  const getClosestEdge = useCallback(
    (node) => {
      const { nodeInternals } = store.getState();
      const storeNodes = Array.from(nodeInternals.values());

      const closestNode = storeNodes.reduce(
        (res, n) => {
          if (n.id !== node.id) {
            const dx = n.positionAbsolute.x - node.positionAbsolute.x;
            const dy = n.positionAbsolute.y - node.positionAbsolute.y;
            const d = Math.sqrt(dx * dx + dy * dy);

            if (d < res.distance && d < MIN_DISTANCE) {
              res.distance = d;
              res.node = n;
            }
          }

          return res;
        },
        {
          distance: Number.MAX_VALUE,
          node: null,
        }
      );

      if (!closestNode.node) {
        return null;
      }

      const closeNodeIsSource =
        closestNode.node.positionAbsolute.x < node.positionAbsolute.x;

      return {
        id: closeNodeIsSource
          ? `${closestNode.node.id}-${node.id}`
          : `${node.id}-${closestNode.node.id}`,
        source: closeNodeIsSource ? closestNode.node.id : node.id,
        target: closeNodeIsSource ? node.id : closestNode.node.id,
      };
    },
    [store]
  );

  const onNodeDrag = useCallback(
    (_, node) => {
      const closeEdge = getClosestEdge(node);

      setEdges((es) => {
        const nextEdges = es.filter((e) => e.className !== "temp");

        if (
          closeEdge &&
          !nextEdges.find(
            (ne) =>
              ne.source === closeEdge.source && ne.target === closeEdge.target
          )
        ) {
          closeEdge.className = "temp";
          nextEdges.push(closeEdge);
        }

        return nextEdges;
      });
    },
    [getClosestEdge, setEdges]
  );

  const onNodeDragStop = useCallback(
    (_, node) => {
      const closeEdge = getClosestEdge(node);

      setEdges((es) => {
        const nextEdges = es.filter((e) => e.className !== "temp");

        if (
          closeEdge &&
          !nextEdges.find(
            (ne) =>
              ne.source === closeEdge.source && ne.target === closeEdge.target
          )
        ) {
          nextEdges.push(closeEdge);
        }

        return nextEdges;
      });
    },
    [getClosestEdge]
  );

  return (
    <div
      className="wrapper"
      ref={reactFlowWrapper}
      style={{ width: "100%", height: "100%" }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onNodeClick={onNodeClick}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onNodesDelete={onNodesDelete}
        nodeTypes={{ customNode: CustomNode }}
        onInit={setRfInstance}
        fitView
        fitViewOptions={{ padding: 2 }}
      >
        <Controls />
        <MiniMap />
        <Background variant="dots" gap={12} size={1} />
      </ReactFlow>
    </div>
  );
};

export default AddNodeOnEdgeDrop;
