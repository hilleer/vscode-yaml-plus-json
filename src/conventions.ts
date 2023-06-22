import { NamingConvention } from './config';
import { camelCase, pascalCase, paramCase, snakeCase } from 'change-case';

export function getConventionFunction(toCase: NamingConvention): (kIn: string) => string{
    const converter = {
        [NamingConvention.Camel]: camelCase,
        [NamingConvention.Pascal]: pascalCase,
        [NamingConvention.Snake]: snakeCase,
        [NamingConvention.Kebab]: paramCase,
        [NamingConvention.None]: (str: string) => str
    }[toCase];

    return converter;
}

export function changeObjectKeys(oIn: {[k: string]: any}, caseChange: (kIn: string) => string): object{
    return Object.keys(oIn).reduce(function (newObj: {[k: string]: any}, key: string) {
        let val = oIn[key];
        let newVal = (typeof val === 'object') ? changeObjectKeys(val, caseChange) : val;
        if(Object.prototype.toString.call(val) !== '[object Array]'){
            newObj[caseChange(key)] = newVal;
        }
        else{
            newObj[caseChange(key)] = Object.values(newVal);
        }
        return newObj;
    }, {});
}