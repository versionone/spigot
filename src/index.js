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

    var formattedUrl = url.slice(-1) === '/' ? url.substring(0, url.length - 1) : url;
    const v1Url = formattedUrl || 'http://localhost/VersionOne.Web';

    const spigot = new Spigot({
        url: v1Url,
        username: username,
        password: password,
        throttle: throttle,
        throttleInterval: throttleinterval,
        forever: forever
    });

    MetaEnforcer(v1Url, data)
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