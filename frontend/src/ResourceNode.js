import React, { useState, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import K8sLogo from './K8sLogo';

// Resource type to icon URL mapping (for non-K8s logo resources)
const getResourceIcon = (type) => {
  const iconMap = {
    Deployment: 'https://raw.githubusercontent.com/kubernetes/community/master/icons/workloads/icon/deployment.svg',
    StatefulSet: 'https://raw.githubusercontent.com/kubernetes/community/master/icons/workloads/icon/statefulset.svg',
    DaemonSet: 'https://raw.githubusercontent.com/kubernetes/community/master/icons/workloads/icon/daemonset.svg',
    ConfigMap: 'https://raw.githubusercontent.com/kubernetes/community/master/icons/config/icon/configmap.svg',
    Secret: 'https://raw.githubusercontent.com/kubernetes/community/master/icons/config/icon/secret.svg',
    Ingress: 'https://raw.githubusercontent.com/kubernetes/community/master/icons/networking/icon/ingress.svg',
    PVC: 'https://raw.githubusercontent.com/kubernetes/community/master/icons/storage/icon/persistentvolumeclaim.svg',
  };
  
  return iconMap[type] || null;
};

// Fallback emoji icons if images fail to load
const getEmojiIcon = (type) => {
  const emojiMap = {
    Deployment: '📦',
    StatefulSet: '🗄️',
    Service: '🔌',
    Pod: '🟢',
    ConfigMap: '⚙️',
    Secret: '🔐',
    Ingress: '🌐',
    PVC: '💾',
    DaemonSet: '🔄',
  };
  return emojiMap[type] || '📋';
};

// Get icon based on container image
const getImageIcon = (image) => {
  if (!image) return null;
  
  // Common image patterns
  if (image.includes('nginx')) return '🌐';
  if (image.includes('redis')) return '🔴';
  if (image.includes('postgres') || image.includes('postgresql')) return '🐘';
  if (image.includes('mysql')) return '🗄️';
  if (image.includes('mongo')) return '🍃';
  if (image.includes('kafka')) return '📨';
  if (image.includes('elasticsearch')) return '🔍';
  if (image.includes('prometheus')) return '📊';
  if (image.includes('grafana')) return '📈';
  if (image.includes('vault')) return '🔒';
  
  return null;
};

const ResourceNode = ({ data }) => {
  const [imageSrc, setImageSrc] = useState(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    // For Pods and Services, we use the inline K8sLogo component
    // For other resources, try to load icons
    const shouldUseK8sLogo = data.type === 'Pod' || data.type === 'Service';
    
    if (shouldUseK8sLogo) {
      setImageSrc(null); // Use inline component
      setImageError(false);
    } else {
      const iconUrl = getResourceIcon(data.type);
      if (iconUrl) {
        setImageSrc(iconUrl);
        setImageError(false);
      } else {
        setImageSrc(null);
      }
    }
  }, [data.type]);

  const handleImageError = () => {
    setImageError(true);
  };

  const getColor = (type) => {
    const colors = {
      Deployment: 'bg-blue-100 border-blue-500',
      StatefulSet: 'bg-purple-100 border-purple-500',
      Service: 'bg-green-100 border-green-500',
      ConfigMap: 'bg-yellow-100 border-yellow-500',
      Secret: 'bg-red-100 border-red-500',
      Ingress: 'bg-indigo-100 border-indigo-500',
      PVC: 'bg-gray-100 border-gray-500',
      DaemonSet: 'bg-orange-100 border-orange-500',
      Pod: 'bg-emerald-100 border-emerald-500',
    };
    return colors[type] || 'bg-gray-100 border-gray-500';
  };

  const imageIcon = getImageIcon(data.image);
  const emojiIcon = getEmojiIcon(data.type);
  const hasSecretData = data.secretData && Object.keys(data.secretData).length > 0;
  const useK8sLogo = data.type === 'Pod' || data.type === 'Service';

  return (
    <div className={`px-4 py-2 shadow-md rounded-md border-2 ${getColor(data.type)} min-w-[150px] relative`}>
      {/* Source handles - for outgoing edges */}
      <Handle
        type="source"
        position={Position.Right}
        id="source"
        style={{ background: '#555', width: 8, height: 8 }}
      />
      
      {/* Target handles - for incoming edges */}
      <Handle
        type="target"
        position={Position.Left}
        id="target"
        style={{ background: '#555', width: 8, height: 8 }}
      />
      
      <div className="flex items-center gap-2">
        {/* Kubernetes Logo/Icon */}
        <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
          {useK8sLogo ? (
            // Use inline SVG component for Pods and Services
            <K8sLogo className="w-8 h-8" />
          ) : imageSrc && !imageError ? (
            // Try to load icon from URL for other resources
            <img
              src={imageSrc}
              alt={`${data.type} icon`}
              className="w-8 h-8 object-contain"
              onError={handleImageError}
              style={{ maxWidth: '32px', maxHeight: '32px' }}
            />
          ) : (
            // Fallback to emoji
            <span className="text-2xl">{imageIcon || emojiIcon}</span>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm truncate">{data.name}</div>
          <div className="text-xs text-gray-600">{data.type}</div>
          {data.namespace && (
            <div className="text-xs text-gray-500 truncate">ns: {data.namespace}</div>
          )}
          {data.image && (
            <div className="text-xs text-gray-400 truncate" title={data.image}>
              🐳 {data.image.split('/').pop().split(':')[0]}
            </div>
          )}
          {hasSecretData && (
            <div className="text-xs text-red-600 mt-1">
              🔐 {Object.keys(data.secretData).length} keys
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResourceNode;
