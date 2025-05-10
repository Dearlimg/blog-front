# 使用 Nginx 官方基础镜像
FROM nginx:alpine

# 移除 Nginx 默认配置文件
RUN rm /etc/nginx/conf.d/default.conf

# 将项目中的 Nginx 配置文件复制到容器内
COPY nginx.conf /etc/nginx/conf.d

# 将项目文件复制到 Nginx 的默认网站根目录
COPY . /usr/share/nginx/html

# 暴露容器的 80 端口
EXPOSE 80

# 启动 Nginx 服务器
CMD ["nginx", "-g", "daemon off;"]