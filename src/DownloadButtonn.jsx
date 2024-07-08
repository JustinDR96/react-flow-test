import React from 'react';
import { useReactFlow, getRectOfNodes, getTransformForBounds } from 'reactflow';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

const imageWidth = 2048;
const imageHeight = 1536;

function downloadPDF(dataUrl, causeId) {
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'px',
    format: [imageWidth / 2, imageHeight / 2],
  });
  const fileName = `Cause${causeId}_mindmap.pdf`;
  console.log(`Saving PDF as: ${fileName}`); // Debug log
  pdf.addImage(dataUrl, 'PNG', 0, 0, imageWidth / 2, imageHeight / 2);
  pdf.save(fileName);
}

function DownloadButton({ causeId }) {
  const { getNodes } = useReactFlow();
  const onClick = () => {
    console.log(`Downloading PDF for causeId: ${causeId}`); // Debug log
    const nodesBounds = getRectOfNodes(getNodes());
    const transform = getTransformForBounds(nodesBounds, imageWidth, imageHeight, 0.5, 2);

    toPng(document.querySelector('.react-flow__viewport'), {
      backgroundColor: '#1a365d',
      width: imageWidth,
      height: imageHeight,
      style: {
        width: imageWidth,
        height: imageHeight,
        transform: `translate(${transform[0]}px, ${transform[1]}px) scale(${transform[2]})`,
      },
    }).then((dataUrl) => downloadPDF(dataUrl, causeId));
  };

  return (
    <button className="download-btn" onClick={onClick}>
      Download PDF
    </button>
  );
}

export default DownloadButton;
