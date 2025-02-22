import { useState, useCallback, useEffect, useRef } from "react";
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  getIncomers,
  getOutgoers,
  getConnectedEdges,
  useReactFlow,
  ReactFlowProvider,
  useStoreApi,
} from "reactflow";
import "reactflow/dist/style.css";
import CustomNode from "./components/ReactFlow/CustomNode";
import { initialNodes, initialEdges } from "./components/ReactFlow/InitialData";
import "./components/ReactFlow/updatenode.css";

const nodeTypes = {
  customNode: CustomNode,
};

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
}) => {
  const reactFlowWrapper = useRef(null);
  const connectingNodeId = useRef(null);
  const { screenToFlowPosition } = useReactFlow();

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

  const store = useStoreApi();

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
        nodeTypes={nodeTypes}
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

function Application() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState(null);
  const [labelInputValue, setLabelInputValue] = useState("");
  const [nodeBg, setNodeBg] = useState("#eee");
  const [nodeHidden, setNodeHidden] = useState(false);

  const store = useStoreApi();

  const deleteNode = () => {
    setNodes((currentNodes) =>
      currentNodes.filter((node) => node.id !== selectedNode.id)
    );
    setEdges((currentEdges) =>
      currentEdges.filter(
        (edge) =>
          edge.source !== selectedNode.id && edge.target !== selectedNode.id
      )
    );
    setSelectedNode(null); // Close the popup after deleting
  };

  const onNodesDelete = useCallback(
    (deleted) => {
      setEdges((prevEdges) => {
        let updatedEdges = [...prevEdges];

        deleted.forEach((node) => {
          const incomers = getIncomers(node, nodes, prevEdges);
          const outgoers = getOutgoers(node, nodes, prevEdges);
          const connectedEdges = getConnectedEdges([node], prevEdges);

          const remainingEdges = updatedEdges.filter(
            (edge) => !connectedEdges.includes(edge)
          );

          const createdEdges = incomers.flatMap(({ id: source }) =>
            outgoers.map(({ id: target }) => ({
              id: `${source}->${target}`,
              source,
              target,
            }))
          );

          updatedEdges = [...remainingEdges, ...createdEdges];
        });

        return updatedEdges;
      });
    },
    [nodes, setEdges]
  );

  const onNodeClick = (event, node) => {
    setSelectedNode(node);
    setLabelInputValue(node.data.label);
    setNodeBg(node.style?.backgroundColor || "#eee");
    setNodeHidden(node.hidden || false);
  };

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

  // Function to add a new node
  const addNode = () => {
    const newNodeId = (nodes.length + 1).toString();
    const lastNode = nodes[nodes.length - 1];
    const newPositionX = lastNode ? lastNode.position.x + 150 : 0;
    const newNode = {
      id: newNodeId,
      position: { x: newPositionX, y: 0 },
      data: { label: newNodeId },
      type: "customNode",
    };
    setNodes((nds) => nds.concat(newNode));
    setEdges((eds) =>
      eds.concat({
        id: `e${lastNode.id}-${newNodeId}`,
        source: lastNode.id,
        target: newNodeId,
      })
    );
  };

  useEffect(() => {
    if (selectedNode) {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === selectedNode.id) {
            return {
              ...node,
              data: {
                ...node.data,
                label: labelInputValue,
              },
            };
          }
          return node;
        })
      );
    }
  }, [labelInputValue, setNodes, selectedNode]);

  useEffect(() => {
    if (selectedNode) {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === selectedNode.id) {
            return {
              ...node,
              style: {
                ...node.style,
                backgroundColor: nodeBg,
              },
            };
          }
          return node;
        })
      );
    }
  }, [nodeBg, setNodes, selectedNode]);

  useEffect(() => {
    if (selectedNode) {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === selectedNode.id) {
            return {
              ...node,
              hidden: nodeHidden,
            };
          }
          return node;
        })
      );
      setEdges((eds) =>
        eds.map((edge) => {
          if (
            edge.source === selectedNode.id ||
            edge.target === selectedNode.id
          ) {
            return {
              ...edge,
              hidden: nodeHidden,
            };
          }
          return edge;
        })
      );
    }
  }, [nodeHidden, setNodes, setEdges, selectedNode]);

  return (
    <div style={{ width: "100%", height: "90vh" }}>
      <AddNodeOnEdgeDrop
        nodes={nodes}
        setNodes={setNodes}
        edges={edges}
        setEdges={setEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodesDelete={onNodesDelete}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
      />
      <button
        onClick={addNode}
        style={{ position: "absolute", top: "10px", right: "10px" }}
      >
        Add Node
      </button>
      {selectedNode && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "10%",
            transform: "translate(-50%, -50%)",
            background: "white",
            padding: "20px",
            borderRadius: "8px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          }}
        >
          <div>
            <label>{`Update node label ${selectedNode.id} :`}</label>
            <button onClick={deleteNode} style={{ marginTop: "0" }}>
              Delete Node
            </button>
            <input
              value={labelInputValue}
              onChange={(e) => setLabelInputValue(e.target.value)}
            />
            <label className="updatenode__bglabel">Background:</label>
            <input value={nodeBg} onChange={(e) => setNodeBg(e.target.value)} />
            <div className="updatenode__checkboxwrapper">
              <label>Hidden:</label>
              <input
                type="checkbox"
                checked={nodeHidden}
                onChange={(e) => setNodeHidden(e.target.checked)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AppWrapper() {
  return (
    <ReactFlowProvider>
      <Application />
    </ReactFlowProvider>
  );
}
