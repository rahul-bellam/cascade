FROM golang:1.22-alpine AS build
WORKDIR /src
COPY services/constraint-engine/go.mod services/constraint-engine/go.sum* ./
RUN go mod download
COPY services/constraint-engine/ ./
RUN go build -o /constraint-engine .

FROM alpine:3.19
WORKDIR /app
COPY --from=build /constraint-engine /app/constraint-engine
COPY content/ /app/content/
ENV CONTENT_DIR=/app/content
EXPOSE 8094
CMD ["/app/constraint-engine"]
