import React from 'react';
import Head from '@docusaurus/Head';
import Link from '@docusaurus/Link';
import {Redirect} from '@docusaurus/router';
import useBaseUrl from '@docusaurus/useBaseUrl';

export default function Home(): JSX.Element {
  const demoUrl = useBaseUrl('/docs/demo');

  return (
    <>
      <Head>
        <title>Home</title>
      </Head>
      <Redirect to={demoUrl} />
      <p>
        If you are not redirected automatically, open the{' '}
        <Link to={demoUrl}>Live Demo</Link>.
      </p>
    </>
  );
}
