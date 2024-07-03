import React from 'react';
import { useReactFlow } from 'reactflow';
import { toPng } from 'html-to-image';

const DownloadButton = () => {
  const { toObject } = useReactFlow();

  const downloadImage = () => {
    const flow = toObject();
    const graphElement = document.querySelector('.react-flow');

    if (graphElement) {
      toPng(graphElement).then((dataUrl) => {
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataUrl);
        downloadAnchorNode.setAttribute("download", "flow.png");
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
      });
    }
  };

  return (
    <button onClick={downloadImage} style={{ position: "relative", top: "10px", left: "10px" }}>
      Download Image
    </button>
  );
};

export default DownloadButton;
