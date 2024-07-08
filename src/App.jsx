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
import dagre from "dagre";
import CustomEdge from "./CustomEdge"; // Import CustomEdge

const nodeTypes = {
  customNode: CustomNode,
};

const edgeTypes = {
  custom: CustomEdge, // Define CustomEdge as a type
};

const MIN_DISTANCE = 10;
const flowKey = 'example-flow';

let nodeCounter = 0;

const getId = () => {
  const date = new Date();
  const year = String(date.getFullYear()).slice(-2); // Get last two digits of the year
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Les mois sont de 0 à 11
  const day = String(date.getDate()).padStart(2, '0');
  
  nodeCounter += 1; // Increment the counter

  return `${day}/${month}/${year}_Cause_${nodeCounter}`;
};

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
      setEdges((eds) => addEdge({ ...params, type: 'custom', data: { label: 'Pourquoi?' } }, eds));
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
          data: { label: `${id}` },
          type: "customNode",
        };

        setNodes((nds) => nds.concat(newNode));
        setEdges((eds) =>
          eds.concat({
            id: `e${connectingNodeId.current}-${id}`,
            source: connectingNodeId.current,
            target: id,
            type: 'custom',
            data: { label: 'Pourquoi?' }
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
        edgeTypes={edgeTypes} // Use the custom edge types
        onInit={(instance) => {
          setRfInstance(instance);
          console.log("ReactFlow instance initialized:", instance);
        }} // Initialize rfInstance
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

const SaveRestore = ({ setNodes, setEdges, nodes, rfInstance, onLayout }) => {
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

  const onAdd = useCallback(() => {
    const id = getId();
    let newNodePosition = { x: 100, y: 100 }; // Default position

    if (nodes && nodes.length > 0) {
      const lastNode = nodes[nodes.length - 1]; // Get the most recently added node
      newNodePosition = {
        x: lastNode.position.x + 200, // Position the new node to the right of the last node
        y: lastNode.position.y
      };
    }

    const newNode = {
      id,
      position: newNodePosition,
      data: { label: `${id}` },
      type: "customNode",
    };
    setNodes((nds) => nds.concat(newNode));
  }, [nodes, setNodes]);

  const onDeleteAll = useCallback(() => {
    setNodes([]);
    setEdges([]);
  }, [setNodes, setEdges]);

  return (
    <Panel position="top-left" style={{ display: "flex", flexDirection: "row", gap: "20px" }}>
      <button onClick={onSave}>Save</button>
      <button onClick={onRestore}>Restore</button>
      <button onClick={onAdd}>Add Node</button>
      <button onClick={onLayout}>Layout</button>
      <button onClick={onDeleteAll}>Delete All Nodes</button>
      <DownloadButton />
    </Panel>
  );
};

function Application() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState(null); // New state for selected node ID
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
    console.log("Node clicked:", node); // Add console.log here
    setSelectedNode(node);
    setSelectedNodeId(node.id); // Update selectedNodeId
    setLabelInputValue(node.data.label);
    setNodeBg(node.style?.backgroundColor || "");
    setNodeHidden(node.hidden || false);
  };

  const nodesWithSelection = nodes.map(node => ({
    ...node,
    style: {
      ...node.style,
      border: node.id === selectedNodeId ? '2px solid blue' : node.style?.border || '1px solid #ddd', // Apply blue border if selected
      backgroundColor: node.style?.backgroundColor || '#fff', // Ensure the background remains white
      borderRadius: node.style?.borderRadius || '10px', // Ensure the border remains rounded
    },
    isSelected: node.id === selectedNodeId,
  }));
  

  
  

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

  const onLayout = useCallback(() => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    dagreGraph.setGraph({
      rankdir: "LR", // Left to Right layout
      nodesep: 150, // Increase this value for more horizontal space between nodes
      ranksep: 100 // Increase this value for more vertical space between nodes
    });

    nodes.forEach((node) => {
      dagreGraph.setNode(node.id, { width: 200, height: 50 });
    });

    edges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const updatedNodes = nodes.map((node) => {
      const { x, y } = dagreGraph.node(node.id);
      node.targetPosition = "top";
      node.sourcePosition = "bottom";

      return {
        ...node,
        position: { x, y },
      };
    });

    setNodes(updatedNodes);
  }, [nodes, edges, setNodes]);

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
        nodes={nodesWithSelection} // Use nodesWithSelection here
        setNodes={setNodes}
        edges={edges}
        setEdges={setEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodesDelete={onNodesDelete}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        setRfInstance={setRfInstance} // Pass setRfInstance here
      />
      <SaveRestore setNodes={setNodes} setEdges={setEdges} nodes={nodes} rfInstance={rfInstance} onLayout={onLayout} />
      
      {selectedNode && (
        <div
          style={{
            position: "absolute",
            left: "20%",
            top: "20%",
            transform: "translate(-50%, -50%)",
            background: "white",
            padding: "10px",
            borderRadius: "8px",
            boxShadow: "0 0 10px rgba(0, 123, 255, 0.5)", // Uniform shadow with blue color
            display: "flex",
            flexDirection: "row",
            alignItems: "center", // Center horizontally
            justifyContent: "center", // Center vertically
          }}
        >
          <div>
          <label style={{ marginTop: '10px' }}>{`Label : ${selectedNode.id} : `}</label>
<input
  style={{ marginTop: '5px' }} // You can adjust the value as needed
  value={labelInputValue}
  onChange={(e) => setLabelInputValue(e.target.value)}
/>

          </div>
          <div style={{
    display: "flex",
    justifyContent: "center", // Center vertically
    alignItems: "center", // Center horizontally if needed
  }}>
    <button 
      onClick={deleteNode} 
      style={{ 
        margin: "10px",
        backgroundColor: "#FF3800", // Couleur de fond bleue
        color: "white", // Couleur du texte blanche
        padding: "10px", // Padding pour agrandir le bouton
        border: "none", // Retirer la bordure par défaut
        borderRadius: "5px", // Arrondir les coins
        cursor: "pointer", // Changer le curseur pour indiquer que c'est cliquable
        fontSize: "16px", // Agrandir le texte
        boxShadow: "0 2px 5px rgba(0, 0, 0, 0.2)", // Ajouter une ombre pour un effet de profondeur
        transition: "background-color 0.3s", // Transition pour l'effet de survol
      }}
      onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#CC2E00"} // Changer la couleur de fond au survol
      onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#FF3800"} // Revenir à la couleur de fond initiale quand le survol est terminé
    >
      Delete Node
    </button>
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
