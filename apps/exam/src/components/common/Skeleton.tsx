import React from 'react';

interface SkeletonProps {
  height?: number | string;
  width?: number | string;
  borderRadius?: number | string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  height = 20,
  width = '100%',
  borderRadius = 'var(--radius-sm)'
}) => {
  return (
    <div
      style={{
        height,
        width,
        borderRadius,
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        animation: 'skeletonPulse 1.5s ease-in-out infinite'
      }}
    />
  );
};
