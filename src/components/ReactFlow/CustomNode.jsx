import React from "react";
import { Handle } from "reactflow";

const CustomNode = ({ data }) => (
  <div
    style={{
      padding: 10,
      border: "1px solid #ddd",
      borderRadius: 5,
      position: "relative",
      backgroundColor: data.backgroundColor || "#fff",
      boxShadow: "0 2px 10px rgba(0,0,0,0.1)", // Ajoute une ombre pour une meilleure visibilité
    }}
  >
    {data.label}
    <Handle
      type="source"
      position="right"
      style={{
        background: "#555",
        width: 10,
        height: 10,
        borderRadius: "50%",
        right: -5,
        top: "50%",
        transform: "translateY(-50%)",
      }}
    />
    <Handle
      type="target"
      position="left"
      style={{
        background: "#555",
        width: 10,
        height: 10,
        borderRadius: "50%",
        left: -5,
        top: "50%",
        transform: "translateY(-50%)",
      }}
    />
  </div>
);

export default CustomNode;
