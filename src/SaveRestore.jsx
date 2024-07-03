import React, { useCallback } from 'react';
import { useReactFlow, Panel } from 'reactflow';
import DownloadButton from './DownloadButtonn';

const flowKey = 'example-flow';

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

export default SaveRestore;
