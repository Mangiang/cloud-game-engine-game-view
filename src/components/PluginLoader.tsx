import React from 'react'
import IframeResizer from 'iframe-resizer-react'
import usePromise from 'react-promise-suspense'

type pluginProps = {
  name: string
}

const PluginLoader = ({ name }: pluginProps) => {
  const sleep = (milliseconds: number) => {
    return new Promise((resolve) => setTimeout(resolve, milliseconds))
  }

  const getPlugin = async (name: string) => {
    const helmReleasesList = await fetch(`http://localhost/helm/deployed`)
    if (helmReleasesList.status !== 200) return <p>Cannot load {name}</p>
    
    const releasesJson = await helmReleasesList.json();
    console.log(releasesJson);
    const releasesList = JSON.parse(releasesJson.services)
    console.log(releasesList)
    const plugin = releasesList.find((obj: any) => obj.name === name)
    if (!plugin) {
      const requestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chartName: `mangiang/${name}`,
          releaseName: name,
          privateChartsRepo: "https://mangiang.github.io/helm-chart/"
        }),
      }
      const helmReleasesInstall = await fetch(
        `http://localhost/helm/install`,
        requestOptions,
      )
      if (helmReleasesInstall.status !== 200) return <p>Cannot load {name}</p>

      const installBodyJson = await helmReleasesInstall.json()
      console.log(installBodyJson);
      if (installBodyJson.status === 'failed') {
        return <p>Cannot load {name}</p>
      }
    }

    await sleep(10000)
    
    const pingPlugin = await fetch(`http://localhost/plugins/${name}`)
    if (pingPlugin.status !== 200) return <p>Cannot load {name}</p>

    return (
      <IframeResizer
        src={`http://localhost/plugins/${name}`}
        style={{ width: '1px', minWidth: '100%' }}
      />
    )
  }

  return usePromise(getPlugin, [name])
}

export default PluginLoader
