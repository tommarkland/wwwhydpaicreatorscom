import hydpLogo from '@/assets/hydp-logo.png';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Logo = ({ className = '', size = 'md' }: LogoProps) => {
  const sizeClasses = {
    sm: 'h-6',
    md: 'h-8',
    lg: 'h-12',
  };

  return (
    <a href="https://www.hydp.ai" target="_blank" rel="noopener noreferrer" className={className}>
      <img 
        src={hydpLogo} 
        alt="HYDP" 
        className={`${sizeClasses[size]} w-auto`}
      />
    </a>
  );
};
