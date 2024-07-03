import React from 'react';

const CustomNode = ({ data }) => {
  return (
    <div>
      <strong>{data.label}</strong>
    </div>
  );
};

export default CustomNode;
