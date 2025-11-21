import Button from './Button';

export default function EmptyState({ 
  icon, 
  title, 
  description, 
  action,
  actionText,
  onAction,
  className = ''
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      {icon && (
        <div className="text-6xl mb-4 opacity-50">
          {icon}
        </div>
      )}
      
      {title && (
        <h3 className="text-xl font-bold text-tv-text mb-2">
          {title}
        </h3>
      )}
      
      {description && (
        <p className="text-tv-textSecondary mb-6 max-w-md">
          {description}
        </p>
      )}
      
      {action}
      
      {(actionText && onAction) && (
        <Button variant="primary" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
}

