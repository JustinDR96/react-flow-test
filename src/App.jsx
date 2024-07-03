import React, { useState, useCallback, useEffect, useRef } from "react";
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
  Panel,
} from "reactflow";
import "reactflow/dist/style.css";
import CustomNode from "./components/ReactFlow/CustomNode";
import { initialNodes, initialEdges } from "./components/ReactFlow/InitialData";
import "./components/ReactFlow/updatenode.css";
import DownloadButton from './DownloadButtonn'; // Import the DownloadButton

const nodeTypes = {
  customNode: CustomNode,
};

const MIN_DISTANCE = 150;
const flowKey = 'example-flow';

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
        onInit={setRfInstance} // Initialize rfInstance
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

const SaveRestore = ({ setNodes, setEdges, rfInstance }) => {
  const { setViewport } = useReactFlow();

  const onSave = useCallback(() => {
    console.log("Save button clicked");
    console.log("flowKey:", flowKey);

    const shouldSave = window.confirm("Voulez-vous sauvegarder?");
    if (shouldSave && rfInstance) {
      const flow = rfInstance.toObject();
      console.log("Saving flow:", flow);

      try {
        localStorage.setItem(flowKey, JSON.stringify(flow));
        console.log("Diagram saved successfully");
        const savedFlow = JSON.parse(localStorage.getItem(flowKey));
        console.log("Saved flow in localStorage:", savedFlow);
      } catch (error) {
        console.error("Error saving to localStorage", error);
      }
    } else {
      console.log("Save cancelled or rfInstance is null");
    }
  }, [rfInstance]);

  const onRestore = useCallback(() => {
    console.log("Restore button clicked");
    console.log("flowKey:", flowKey);

    const restoreFlow = async () => {
      try {
        const flow = JSON.parse(localStorage.getItem(flowKey));
        console.log("Restoring flow from localStorage:", flow);

        if (flow) {
          const { x = 0, y = 0, zoom = 1 } = flow.viewport;
          setNodes(flow.nodes || []);
          setEdges(flow.edges || []);
          setViewport({ x, y, zoom });
          console.log("Diagram restored successfully");
        } else {
          console.log("No flow found in localStorage");
        }
      } catch (error) {
        console.error("Error restoring from localStorage", error);
      }
    };

    restoreFlow();
  }, [setNodes, setEdges, setViewport]);

  return (
    <Panel position="top-left">
      <button onClick={onSave}>Save</button>
      <button onClick={onRestore}>Restore</button>
      <DownloadButton />
    </Panel>
  );
};

function Application() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState(null);
  const [labelInputValue, setLabelInputValue] = useState("");
  const [nodeBg, setNodeBg] = useState("");
  const [nodeHidden, setNodeHidden] = useState(false);
  const [rfInstance, setRfInstance] = useState(null); // State for rfInstance

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
    setNodeBg(node.style?.backgroundColor || "");
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
      <SaveRestore setNodes={setNodes} setEdges={setEdges} rfInstance={rfInstance} />
      
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
            <button onClick={deleteNode} style={{ marginTop: "0" }}>
              Delete Node
            </button>
            <label>{`Update node label ${selectedNode.id} :`}</label>
            
            <input
              value={labelInputValue}
              onChange={(e) => setLabelInputValue(e.target.value)}
            />
            <div className="updatenode__checkboxwrapper">
              {/* <label>Hidden:</label>
              <input
                type="checkbox"
                checked={nodeHidden}
                onChange={(e) => setNodeHidden(e.target.checked)}
              /> */}
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
