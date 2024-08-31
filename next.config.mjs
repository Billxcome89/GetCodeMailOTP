/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config) => {
      // Alias để bỏ qua module 'vertx'
      config.resolve.alias['vertx'] = false;
  
      return config;
    },
  };
  
  export default nextConfig;
  