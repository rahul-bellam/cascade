FROM golang:1.22-alpine AS build
WORKDIR /src
COPY services/cascade-engine/go.mod services/cascade-engine/go.sum* ./
RUN go mod download
COPY services/cascade-engine/ ./
RUN go build -o /cascade-engine .

FROM alpine:3.19
WORKDIR /app
COPY --from=build /cascade-engine /app/cascade-engine
COPY content/ /app/content/
ENV CONTENT_DIR=/app/content
EXPOSE 8090
CMD ["/app/cascade-engine"]
