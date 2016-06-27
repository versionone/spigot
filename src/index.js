import Spigot from './spigot';
import MetaEnforcer from './metaEnforcer';

export default (cmdArgs, data) => {
    const {
        url,
        username,
        password,
        throttle,
        throttleinterval,
        forever,
        parallel
    } = cmdArgs;

    let v1Url = formattedUrl || 'http://localhost/VersionOne.Web';
    const formattedUrl = v1Url.slice(-1) === '/' ? v1Url.substring(0, v1Url.length - 1) : v1Url;

    const spigot = new Spigot({
        url: formattedUrl,
        username: username,
        password: password,
        throttle: throttle,
        throttleInterval: throttleinterval,
        forever: forever
    });

    MetaEnforcer(formattedUrl, data)
        .then(function(transformedData, err) {
            if (parallel) {
                console.log('Executing in a parallel');
                spigot.executeParallel(transformedData);
            }
            else {
                console.log('Executing in sequence');
                spigot.executeSeries(transformedData);
            }
        });
}