FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
USER $APP_UID
WORKDIR /app

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src
COPY build/server.crt /usr/local/share/ca-certificates/server.crt
COPY . .
RUN update-ca-certificates
RUN dotnet nuget add source "https://server:5555/v3/index.json"
RUN dotnet restore "Cardboard.UpdateServer/Cardboard.UpdateServer.csproj"
WORKDIR "/src/Cardboard.UpdateServer"
RUN dotnet build "./Cardboard.UpdateServer.csproj" -c $BUILD_CONFIGURATION -o /app/build

FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "./Cardboard.UpdateServer.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .

RUN mkdir -p /app/files

EXPOSE 8080

ENV ASPNETCORE_URLS=http://+:8080
ENV Paths__Firmware=/app/files/firmware

ENTRYPOINT ["dotnet", "Cardboard.UpdateServer.dll"]
