FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
USER $APP_UID
WORKDIR /app

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src
COPY . .
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

EXPOSE 7969

ENV ASPNETCORE_URLS=http://+:7969
ENV Paths__Firmware=/app/files/firmware
ENV Paths__Controller=/app/files/controller
ENV Paths__Metadata=/app/files/metadata
ENV Paths__DeviceIcons=/app/files/device-icons

ENTRYPOINT ["dotnet", "Cardboard.UpdateServer.dll"]
